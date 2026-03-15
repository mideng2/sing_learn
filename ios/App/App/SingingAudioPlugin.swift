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
        CAPPluginMethod(name: "mixAudio", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "abortSession", returnType: CAPPluginReturnPromise)
    ]

    private var recorder: AVAudioRecorder?
    private var player: AVAudioPlayer?
    private var isRecording = false
    private var recordStartedAt: Date?
    private var currentVoiceUrl: URL?

    @objc func startRecording(_ call: CAPPluginCall) {
        let instrumentSrc = call.getString("instrumentSrc") ?? ""
        requestRecordPermission { granted in
            guard granted else {
                call.reject("麦克风权限被拒绝")
                return
            }

            do {
                try self.configureAudioSessionForRecording()
                let voiceUrl = self.makeTempVoiceURL()
                let settings: [String: Any] = [
                    AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                    AVSampleRateKey: 44100,
                    AVNumberOfChannelsKey: 1,
                    AVEncoderBitRateKey: 96000,
                    AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
                ]

                self.recorder = try AVAudioRecorder(url: voiceUrl, settings: settings)
                self.recorder?.isMeteringEnabled = true
                self.recorder?.prepareToRecord()
                let started = self.recorder?.record() ?? false
                guard started else {
                    call.reject("录音启动失败")
                    return
                }

                self.currentVoiceUrl = voiceUrl
                self.recordStartedAt = Date()
                self.isRecording = true

                // 伴奏播放：此骨架优先保证可编译与可调用。若伴奏 URL 不可被原生读取，不阻塞录音。
                self.startInstrumentPlaybackIfPossible(instrumentSrc)

                call.resolve([
                    "ok": true
                ])
            } catch {
                call.reject("录音初始化失败: \(error.localizedDescription)")
            }
        }
    }

    @objc func getLiveMetrics(_ call: CAPPluginCall) {
        guard isRecording, let recorder else {
            call.resolve([
                "level": 0,
                "currentTime": 0
            ])
            return
        }

        recorder.updateMeters()
        let power = recorder.averagePower(forChannel: 0)
        // power: [-160, 0] -> [0, 1]
        let normalized = max(0.0, min(1.0, (power + 60.0) / 60.0))
        let elapsed = Date().timeIntervalSince(recordStartedAt ?? Date())

        call.resolve([
            "level": normalized,
            "currentTime": elapsed
        ])
    }

    @objc func stopRecording(_ call: CAPPluginCall) {
        guard isRecording else {
            call.reject("当前没有录音会话")
            return
        }
        recorder?.stop()
        player?.stop()
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

        // 无法解析伴奏路径时，降级为“人声导出”为 m4a（避免流程中断）。
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
        isRecording = false
        call.resolve(["ok": true])
    }

    private func requestRecordPermission(_ completion: @escaping (Bool) -> Void) {
        let session = AVAudioSession.sharedInstance()
        if #available(iOS 17.0, *) {
            session.requestRecordPermission { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        } else {
            session.requestRecordPermission { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        }
    }

    private func configureAudioSessionForRecording() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .mixWithOthers])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }

    private func startInstrumentPlaybackIfPossible(_ instrumentSrc: String) {
        guard let instrumentUrl = resolveUrl(from: instrumentSrc) else { return }
        do {
            player = try AVAudioPlayer(contentsOf: instrumentUrl)
            player?.prepareToPlay()
            player?.play()
        } catch {
            // 伴奏播放失败不阻断录音
        }
    }

    private func resolveUrl(from raw: String) -> URL? {
        guard !raw.isEmpty else { return nil }

        if raw.hasPrefix("file://") {
            return URL(string: raw)
        }

        // Capacitor WebView 内的相对路径 (e.g. "/instruments/dagai.m4a")
        // 对应 app bundle 里 public/ 目录下的文件
        if raw.hasPrefix("/") {
            let trimmed = String(raw.dropFirst())
            if let bundlePath = Bundle.main.path(forResource: "public/\(trimmed)", ofType: nil) {
                return URL(fileURLWithPath: bundlePath)
            }
            // 也可能在 tmp 目录（录音产物）
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
        let fileName = "voice_\(Int(Date().timeIntervalSince1970 * 1000)).m4a"
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

        guard
            let instrumentTrack = instrumentAsset.tracks(withMediaType: .audio).first,
            let voiceTrack = voiceAsset.tracks(withMediaType: .audio).first,
            let compositionInstrument = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid),
            let compositionVoice = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        else {
            exportSingleTrackM4A(inputUrl: voiceUrl, outputUrl: outputUrl, completion: completion)
            return
        }

        do {
            try compositionInstrument.insertTimeRange(
                CMTimeRange(start: .zero, duration: instrumentAsset.duration),
                of: instrumentTrack,
                at: .zero
            )
            try compositionVoice.insertTimeRange(
                CMTimeRange(start: .zero, duration: voiceAsset.duration),
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
        exporter.outputURL = outputUrl
        exporter.outputFileType = .m4a
        exporter.exportAsynchronously {
            DispatchQueue.main.async {
                if exporter.status == .completed {
                    completion(true, CMTimeGetSeconds(composition.duration), nil)
                } else {
                    completion(false, 0, exporter.error?.localizedDescription ?? "导出失败")
                }
            }
        }
    }
}
