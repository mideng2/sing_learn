import Foundation
import AVFoundation
import Capacitor

@objc(SingingAudioPlugin)
public class SingingAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SingingAudioPlugin"
    public let jsName = "SingingAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLiveMetrics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateMixSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mixAudio", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "abortSession", returnType: CAPPluginReturnPromise)
    ]

    // 录音（AVAudioRecorder）+ 伴奏播放（AVAudioPlayer）
    private var recorder: AVAudioRecorder?
    private var player: AVAudioPlayer?

    // 耳返（独立 AVAudioEngine，仅用于麦克风监听回放）
    private var monitorEngine: AVAudioEngine?
    private var monitorMixer: AVAudioMixerNode?

    private var preferredBluetoothInput: AVAudioSessionPortDescription?
    private var instrumentVolume: Float = 0.72
    private var voiceVolume: Float = 1.0
    private var isRecording = false
    private var recordStartedAt: Date?
    private var currentVoiceUrl: URL?
    private var routeChangeObserver: NSObjectProtocol?

    // MARK: - Plugin Methods

    @objc func startRecording(_ call: CAPPluginCall) {
        let instrumentSrc = call.getString("instrumentSrc") ?? ""
        requestRecordPermission { granted in
            guard granted else {
                call.reject("麦克风权限被拒绝")
                return
            }

            do {
                self.applyMixSettings(from: call)
                try self.configureAudioSessionForRecording()
                self.beginRouteObservation()
                self.logAudioRoute("after-configure-session")

                // 录音：PCM Float32 无损录制
                let voiceUrl = self.makeTempVoiceURL()
                let activeSampleRate = AVAudioSession.sharedInstance().sampleRate
                let settings: [String: Any] = [
                    AVFormatIDKey: Int(kAudioFormatLinearPCM),
                    AVSampleRateKey: activeSampleRate,
                    AVNumberOfChannelsKey: 1,
                    AVLinearPCMBitDepthKey: 32,
                    AVLinearPCMIsFloatKey: true,
                    AVLinearPCMIsBigEndianKey: false,
                    AVLinearPCMIsNonInterleaved: false
                ]

                self.recorder = try AVAudioRecorder(url: voiceUrl, settings: settings)
                self.recorder?.isMeteringEnabled = true
                self.recorder?.prepareToRecord()
                let started = self.recorder?.record() ?? false
                guard started else {
                    self.logAudioRoute("record-start-failed")
                    call.reject("录音启动失败")
                    return
                }

                self.currentVoiceUrl = voiceUrl
                self.recordStartedAt = Date()
                self.isRecording = true
                self.logAudioRoute("after-recorder-start")

                // 耳返
                do {
                    try self.startMicrophoneMonitor()
                    self.logAudioRoute("after-monitor-start")
                } catch {
                    print("[SingingAudio] startMicrophoneMonitor failed: \(error.localizedDescription)")
                    self.logAudioRoute("monitor-start-failed")
                }

                // 伴奏
                self.startInstrumentPlayback(instrumentSrc)
                self.logAudioRoute("after-instrument-start")

                call.resolve(["ok": true])
            } catch {
                self.logAudioRoute("startRecording-catch")
                call.reject("录音初始化失败: \(error.localizedDescription)")
            }
        }
    }

    @objc func getLiveMetrics(_ call: CAPPluginCall) {
        guard isRecording, let recorder else {
            call.resolve(["level": 0, "currentTime": 0])
            return
        }

        recorder.updateMeters()
        let power = recorder.averagePower(forChannel: 0)
        let normalized = max(0.0, min(1.0, (power + 60.0) / 60.0))
        let elapsed = Date().timeIntervalSince(recordStartedAt ?? Date())

        call.resolve([
            "level": normalized,
            "currentTime": elapsed
        ])
    }

    @objc func updateMixSettings(_ call: CAPPluginCall) {
        applyMixSettings(from: call)
        let iv = instrumentVolume
        let vv = voiceVolume

        if Thread.isMainThread {
            applyLiveVolumes()
        } else {
            DispatchQueue.main.async { [weak self] in
                self?.applyLiveVolumes()
            }
        }
        call.resolve([
            "ok": true,
            "instrumentVolume": iv,
            "voiceVolume": vv
        ])
    }

    @objc func stopRecording(_ call: CAPPluginCall) {
        guard isRecording else {
            call.reject("当前没有录音会话")
            return
        }
        recorder?.stop()
        player?.stop()
        endRouteObservation()
        stopMicrophoneMonitor()
        isRecording = false

        let duration = Date().timeIntervalSince(recordStartedAt ?? Date())
        call.resolve([
            "voiceFileUri": currentVoiceUrl?.absoluteString ?? "",
            "durationMs": Int(duration * 1000.0)
        ])
    }

    @objc func mixAudio(_ call: CAPPluginCall) {
        guard let voiceUri = call.getString("voiceFileUri"), !voiceUri.isEmpty else {
            call.reject("缺少 voiceFileUri")
            return
        }
        let instrumentSrc = call.getString("instrumentSrc") ?? ""
        applyMixSettings(from: call)

        guard let voiceUrl = resolveUrl(from: voiceUri) else {
            call.reject("voiceFileUri 无法解析")
            return
        }

        let outputUrl = makeTempMixURL()
        removeFileIfExists(at: outputUrl)

        let mixCompletion: (URL, TimeInterval) -> Void = { outUrl, duration in
            let size = (try? FileManager.default.attributesOfItem(atPath: outUrl.path)[.size] as? NSNumber)?.intValue ?? 0
            let bitrate = duration > 0 ? Int((Double(size) * 8.0) / duration / 1000.0) : 0
            call.resolve([
                "mixFileUri": outUrl.absoluteString,
                "durationMs": Int(duration * 1000.0),
                "sizeBytes": size,
                "format": "m4a",
                "bitrateKbps": bitrate
            ])
        }

        guard let instrumentUrl = resolveUrl(from: instrumentSrc) else {
            exportSingleTrackM4A(inputUrl: voiceUrl, outputUrl: outputUrl) { success, duration, message in
                if success {
                    mixCompletion(outputUrl, duration)
                } else {
                    call.reject(message ?? "混音失败")
                }
            }
            return
        }

        exportMixedM4A(instrumentUrl: instrumentUrl, voiceUrl: voiceUrl, outputUrl: outputUrl) { success, duration, message in
            if success {
                mixCompletion(outputUrl, duration)
            } else {
                call.reject(message ?? "混音失败")
            }
        }
    }

    @objc func deleteFile(_ call: CAPPluginCall) {
        guard let fileUri = call.getString("fileUri"), let url = resolveUrl(from: fileUri) else {
            call.reject("fileUri 无效")
            return
        }
        removeFileIfExists(at: url)
        call.resolve(["ok": true])
    }

    @objc func abortSession(_ call: CAPPluginCall) {
        recorder?.stop()
        player?.stop()
        endRouteObservation()
        stopMicrophoneMonitor()
        isRecording = false
        call.resolve(["ok": true])
    }

    // MARK: - Audio Session

    private func configureAudioSessionForRecording() throws {
        let session = AVAudioSession.sharedInstance()
        preferredBluetoothInput = preferredBluetoothHFPInput()
        logAudioRoute("before-configure-session")

        // 录音场景优先稳定路由：playAndRecord + HFP（不启用 A2DP）
        // A2DP 仅输出、不可作为录音输入，和麦克风同时使用时容易引发路由异常。
        var categoryOptions: AVAudioSession.CategoryOptions = [.defaultToSpeaker, .allowBluetooth]

        // default 在有线耳机下耳返更稳定；结合 0.005s buffer 降低爆音风险
        try session.setCategory(.playAndRecord, mode: .default, options: categoryOptions)
        // 0.002 在部分机型会出现底噪/爆音，0.005 更稳定
        try session.setPreferredIOBufferDuration(0.005)
        try session.setPreferredSampleRate(44100)
        try session.setActive(true, options: .notifyOthersOnDeactivation)
        preferHeadsetInputIfAvailable()
        logAudioRoute("after-prefer-input")
    }

    // MARK: - 耳返（独立 AVAudioEngine）

    private func startMicrophoneMonitor() throws {
        stopMicrophoneMonitor()

        let engine = AVAudioEngine()
        let inputNode = engine.inputNode
        let mixer = AVAudioMixerNode()
        let inputFormat = inputNode.outputFormat(forBus: 0)
        print("[SingingAudio] monitor input format: sr=\(inputFormat.sampleRate), ch=\(inputFormat.channelCount)")

        engine.attach(mixer)
        // 显式使用输入格式，避免自动格式协商在部分设备上引入失真
        engine.connect(inputNode, to: mixer, format: inputFormat)
        engine.connect(mixer, to: engine.mainMixerNode, format: inputFormat)
        mixer.volume = voiceVolume

        engine.prepare()
        try engine.start()
        print("[SingingAudio] monitor engine started: \(engine.isRunning)")

        monitorEngine = engine
        monitorMixer = mixer
    }

    private func stopMicrophoneMonitor() {
        guard let engine = monitorEngine else { return }
        if let mixer = monitorMixer {
            engine.disconnectNodeInput(mixer)
            engine.disconnectNodeOutput(mixer)
            engine.detach(mixer)
        }
        engine.stop()
        engine.reset()
        monitorMixer = nil
        monitorEngine = nil
    }

    private func beginRouteObservation() {
        endRouteObservation()
        routeChangeObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance(),
            queue: .main
        ) { [weak self] _ in
            guard let self, self.isRecording else { return }
            self.logAudioRoute("route-changed")
            do {
                try self.startMicrophoneMonitor()
                self.logAudioRoute("after-monitor-restart")
            } catch {
                print("[SingingAudio] monitor restart failed: \(error.localizedDescription)")
            }
        }
    }

    private func endRouteObservation() {
        if let obs = routeChangeObserver {
            NotificationCenter.default.removeObserver(obs)
            routeChangeObserver = nil
        }
    }

    // MARK: - 伴奏播放

    private func startInstrumentPlayback(_ instrumentSrc: String) {
        guard let instrumentUrl = resolveUrl(from: instrumentSrc) else {
            print("[SingingAudio] instrument url resolve failed: \(instrumentSrc)")
            return
        }
        do {
            player = try AVAudioPlayer(contentsOf: instrumentUrl)
            player?.volume = min(1.0, instrumentVolume)
            player?.prepareToPlay()
            let played = player?.play() ?? false
            print("[SingingAudio] instrument play: ok=\(played), url=\(instrumentUrl.lastPathComponent)")
        } catch {
            // 伴奏播放失败不阻断录音
            print("[SingingAudio] instrument play failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Mix Settings

    private func applyMixSettings(from call: CAPPluginCall) {
        if let iv = doubleFromCall(call, key: "instrumentVolume") {
            instrumentVolume = normalizedVolume(iv, fallback: instrumentVolume)
        }
        if let vv = doubleFromCall(call, key: "voiceVolume") {
            voiceVolume = normalizedVolume(vv, fallback: voiceVolume)
        }
    }

    private func applyLiveVolumes() {
        player?.volume = min(1.0, max(0.0, instrumentVolume))
        monitorMixer?.volume = voiceVolume
    }

    // MARK: - 混音导出

    private func exportSingleTrackM4A(inputUrl: URL, outputUrl: URL, completion: @escaping (Bool, TimeInterval, String?) -> Void) {
        let asset = AVURLAsset(url: inputUrl)
        guard let exporter = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetAppleM4A) else {
            completion(false, 0, "导出器创建失败")
            return
        }
        exporter.outputURL = outputUrl
        exporter.outputFileType = .m4a
        exporter.exportAsynchronously {
            DispatchQueue.main.async {
                if exporter.status == .completed {
                    completion(true, CMTimeGetSeconds(asset.duration), nil)
                } else {
                    completion(false, 0, exporter.error?.localizedDescription ?? "导出失败")
                }
            }
        }
    }

    private func exportMixedM4A(instrumentUrl: URL, voiceUrl: URL, outputUrl: URL, completion: @escaping (Bool, TimeInterval, String?) -> Void) {
        let composition = AVMutableComposition()
        let instrumentAsset = AVURLAsset(url: instrumentUrl)
        let voiceAsset = AVURLAsset(url: voiceUrl)
        let targetDuration = preferredMixDuration(instrumentDuration: instrumentAsset.duration, voiceDuration: voiceAsset.duration)

        guard
            let instrumentTrack = instrumentAsset.tracks(withMediaType: .audio).first,
            let voiceTrack = voiceAsset.tracks(withMediaType: .audio).first,
            let compositionInstrument = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid),
            let compositionVoice = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        else {
            exportSingleTrackM4A(inputUrl: voiceUrl, outputUrl: outputUrl, completion: completion)
            return
        }

        guard targetDuration.isValid, targetDuration.seconds > 0 else {
            exportSingleTrackM4A(inputUrl: voiceUrl, outputUrl: outputUrl, completion: completion)
            return
        }

        do {
            try compositionInstrument.insertTimeRange(
                CMTimeRange(start: .zero, duration: targetDuration),
                of: instrumentTrack,
                at: .zero
            )
            try compositionVoice.insertTimeRange(
                CMTimeRange(start: .zero, duration: targetDuration),
                of: voiceTrack,
                at: .zero
            )
        } catch {
            completion(false, 0, "音轨合成失败: \(error.localizedDescription)")
            return
        }

        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetAppleM4A) else {
            completion(false, 0, "导出器创建失败")
            return
        }

        let instrumentMix = AVMutableAudioMixInputParameters(track: compositionInstrument)
        instrumentMix.setVolume(instrumentVolume, at: .zero)
        let voiceMix = AVMutableAudioMixInputParameters(track: compositionVoice)
        voiceMix.setVolume(voiceVolume, at: .zero)
        let audioMix = AVMutableAudioMix()
        audioMix.inputParameters = [instrumentMix, voiceMix]

        exporter.outputURL = outputUrl
        exporter.outputFileType = .m4a
        exporter.audioMix = audioMix
        exporter.exportAsynchronously {
            DispatchQueue.main.async {
                if exporter.status == .completed {
                    completion(true, CMTimeGetSeconds(targetDuration), nil)
                } else {
                    completion(false, 0, exporter.error?.localizedDescription ?? "导出失败")
                }
            }
        }
    }

    // MARK: - Helpers

    private func requestRecordPermission(_ completion: @escaping (Bool) -> Void) {
        let session = AVAudioSession.sharedInstance()
        session.requestRecordPermission { granted in
            DispatchQueue.main.async { completion(granted) }
        }
    }

    private func preferredBluetoothHFPInput() -> AVAudioSessionPortDescription? {
        let session = AVAudioSession.sharedInstance()
        return session.availableInputs?.first(where: { $0.portType == .bluetoothHFP })
    }

    private func logAudioRoute(_ tag: String) {
        let session = AVAudioSession.sharedInstance()
        let currentInputs = session.currentRoute.inputs.map { "\($0.portType.rawValue):\($0.portName)" }.joined(separator: ",")
        let currentOutputs = session.currentRoute.outputs.map { "\($0.portType.rawValue):\($0.portName)" }.joined(separator: ",")
        let availableInputs = (session.availableInputs ?? []).map { "\($0.portType.rawValue):\($0.portName)" }.joined(separator: ",")
        print(
            """
            [SingingAudio][\(tag)]
              category=\(session.category.rawValue) mode=\(session.mode.rawValue)
              sampleRate=\(session.sampleRate) preferredSampleRate=\(session.preferredSampleRate)
              ioBuffer=\(session.ioBufferDuration) preferredIOBuffer=\(session.preferredIOBufferDuration)
              currentInputs=[\(currentInputs)] currentOutputs=[\(currentOutputs)]
              availableInputs=[\(availableInputs)]
            """
        )
    }

    private func preferHeadsetInputIfAvailable() {
        let session = AVAudioSession.sharedInstance()
        // 关键：不要强制选择蓝牙输入，否则会把路由锁死在 HFP，
        // 造成“扬声器/有线无声，蓝牙有声”。
        // 仅在有线耳机麦存在时指定输入；其他情况交给系统自动路由。
        let preferredPortTypes: [AVAudioSession.Port] = [.headsetMic]
        guard let availableInputs = session.availableInputs else { return }
        if let preferredInput = availableInputs.first(where: { preferredPortTypes.contains($0.portType) }) {
            try? session.setPreferredInput(preferredInput)
            try? session.overrideOutputAudioPort(.none)
            return
        }

        // 无有线麦克风时，清空 preferredInput，让系统按当前输出设备自动路由。
        // 注意：这里不能强制 speaker，否则插着有线耳机时会把声音打到外放。
        try? session.setPreferredInput(nil)
        try? session.overrideOutputAudioPort(.none)
    }

    private func doubleFromCall(_ call: CAPPluginCall, key: String) -> Double? {
        guard let opts = call.options else { return nil }
        func value(from raw: Any?) -> Double? {
            guard let raw else { return nil }
            if raw is NSNull { return nil }
            if let n = raw as? NSNumber { return n.doubleValue }
            if let d = raw as? Double { return d }
            if let i = raw as? Int { return Double(i) }
            if let s = raw as? String, let v = Double(s) { return v }
            return nil
        }
        func fromDict(_ dict: NSDictionary?) -> Double? {
            guard let dict else { return nil }
            return value(from: dict[key])
        }
        if let v = value(from: opts[key]) { return v }
        if let v = fromDict(opts["options"] as? NSDictionary) { return v }
        if let v = fromDict(opts["value"] as? NSDictionary) { return v }
        return nil
    }

    private func normalizedVolume(_ value: Double?, fallback: Float) -> Float {
        guard let value else { return fallback }
        return Float(max(0.0, min(1.5, value)))
    }

    private func preferredMixDuration(instrumentDuration: CMTime, voiceDuration: CMTime) -> CMTime {
        let voiceSeconds = CMTimeGetSeconds(voiceDuration)
        let instrumentSeconds = CMTimeGetSeconds(instrumentDuration)
        if voiceSeconds.isFinite, voiceSeconds > 0 {
            if instrumentSeconds.isFinite, instrumentSeconds > 0 {
                return CMTimeMinimum(voiceDuration, instrumentDuration)
            }
            return voiceDuration
        }
        return instrumentDuration
    }

    private func resolveUrl(from raw: String) -> URL? {
        guard !raw.isEmpty else { return nil }

        if raw.hasPrefix("file://") {
            return URL(string: raw)
        }

        if raw.hasPrefix("/") {
            let trimmed = String(raw.dropFirst())
            if let bundlePath = Bundle.main.path(forResource: "public/\(trimmed)", ofType: nil) {
                return URL(fileURLWithPath: bundlePath)
            }
            let tmpPath = NSTemporaryDirectory() + trimmed
            if FileManager.default.fileExists(atPath: tmpPath) {
                return URL(fileURLWithPath: tmpPath)
            }
            return URL(fileURLWithPath: raw)
        }

        if raw.hasPrefix("http://") || raw.hasPrefix("https://") || raw.hasPrefix("capacitor://") {
            return URL(string: raw)
        }

        return URL(string: raw)
    }

    private func makeTempVoiceURL() -> URL {
        let fileName = "voice_\(Int(Date().timeIntervalSince1970 * 1000)).caf"
        return URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(fileName)
    }

    private func makeTempMixURL() -> URL {
        let fileName = "mix_\(Int(Date().timeIntervalSince1970 * 1000)).m4a"
        return URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(fileName)
    }

    private func removeFileIfExists(at url: URL) {
        if FileManager.default.fileExists(atPath: url.path) {
            try? FileManager.default.removeItem(at: url)
        }
    }
}
