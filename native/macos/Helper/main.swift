// chapcam-vcam-mac - pushes raw BGRA frames from stdin into the sink stream of
// the "ChapCam Camera" Core Media IO extension.
//
//   chapcam-vcam-mac probe              exit 0 when the camera is visible
//   chapcam-vcam-mac stream W H FPS     read W*H*4 byte BGRA frames (top-down)
//                                       and print "stats ..." on stderr every second
//   chapcam-vcam-mac verify             read the camera output like a video app and
//                                       print "verify frames=N real=R placeholder=P"
//
// Exit codes: 3 camera not found, 4 no frame read back, 5 extension stopped consuming,
// 7 extension never started its sink stream.
import AVFoundation
import CoreMedia
import CoreMediaIO
import CoreVideo
import Foundation

let deviceName = "ChapCam Camera"
// Must match the deviceID declared in CameraExtension/Provider.swift.
let deviceUID = "5F2B8E14-9C3A-4D7E-B1A6-2E4C8F0D9A37"

func log(_ message: String) {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
}

func address(_ selector: Int) -> CMIOObjectPropertyAddress {
    CMIOObjectPropertyAddress(
        mSelector: CMIOObjectPropertySelector(selector),
        mScope: CMIOObjectPropertyScope(kCMIOObjectPropertyScopeGlobal),
        mElement: CMIOObjectPropertyElement(kCMIOObjectPropertyElementMain)
    )
}

func objectIDs(_ selector: Int, of object: CMIOObjectID) -> [CMIOObjectID] {
    var addr = address(selector)
    var size: UInt32 = 0
    guard CMIOObjectGetPropertyDataSize(object, &addr, 0, nil, &size) == noErr, size > 0 else { return [] }
    var ids = [CMIOObjectID](repeating: 0, count: Int(size) / MemoryLayout<CMIOObjectID>.size)
    var used: UInt32 = 0
    guard CMIOObjectGetPropertyData(object, &addr, 0, nil, size, &used, &ids) == noErr else { return [] }
    return ids
}

func name(of object: CMIOObjectID) -> String? {
    var addr = address(kCMIOObjectPropertyName)
    var value: Unmanaged<CFString>?
    var used: UInt32 = 0
    let size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    let status = withUnsafeMutablePointer(to: &value) {
        CMIOObjectGetPropertyData(object, &addr, 0, nil, size, &used, $0)
    }
    guard status == noErr, let cf = value else { return nil }
    return cf.takeRetainedValue() as String
}

func uid(of device: CMIOObjectID) -> String? {
    var addr = address(kCMIODevicePropertyDeviceUID)
    var value: Unmanaged<CFString>?
    var used: UInt32 = 0
    let size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    let status = withUnsafeMutablePointer(to: &value) {
        CMIOObjectGetPropertyData(device, &addr, 0, nil, size, &used, $0)
    }
    guard status == noErr, let cf = value else { return nil }
    return cf.takeRetainedValue() as String
}

// Command-line tools have no main run loop serviced by AppKit: without this,
// CoreMediaIO may never deliver the device list published by camera extensions.
func useInternalCMIOThread() {
    // kCMIOHardwarePropertyRunLoop ('rnlp') is not exported to Swift.
    var addr = address(0x726E_6C70)
    var runLoop: CFRunLoop? = nil
    let status = CMIOObjectSetPropertyData(
        CMIOObjectID(kCMIOObjectSystemObject), &addr, 0, nil,
        UInt32(MemoryLayout<CFRunLoop?>.size), &runLoop)
    if status != noErr { log("kCMIOHardwarePropertyRunLoop: \(status)") }
}

// CoreMediaIO only lists camera-extension devices in a process once AVFoundation
// has discovered them (same approach as Apple's CMIO sample client and OBS).
func discoverExtensionCameras() {
    let types: [AVCaptureDevice.DeviceType]
    if #available(macOS 14.0, *) {
        types = [.external, .builtInWideAngleCamera]
    } else {
        types = [.externalUnknown, .builtInWideAngleCamera]
    }
    let session = AVCaptureDevice.DiscoverySession(deviceTypes: types, mediaType: .video, position: .unspecified)
    log("AVFoundation: \(session.devices.map { $0.localizedName }.joined(separator: " | "))")
}

func deviceNames() -> [String] {
    objectIDs(kCMIOHardwarePropertyDevices, of: CMIOObjectID(kCMIOObjectSystemObject)).map { name(of: $0) ?? "?" }
}

func isChapCam(_ device: CMIOObjectID) -> Bool {
    name(of: device) == deviceName || uid(of: device)?.uppercased() == deviceUID
}

func direction(of stream: CMIOStreamID) -> UInt32? {
    var addr = address(kCMIOStreamPropertyDirection)
    var value: UInt32 = 0
    var used: UInt32 = 0
    let status = CMIOObjectGetPropertyData(stream, &addr, 0, nil, UInt32(MemoryLayout<UInt32>.size), &used, &value)
    return status == noErr ? value : nil
}

struct Camera {
    let device: CMIODeviceID
    let source: CMIOStreamID
    let sink: CMIOStreamID
}

// Localized stream names declared in CameraExtension/Provider.swift.
let sourceStreamName = "ChapCam Camera"
let sinkStreamName = "ChapCam Camera Input"

func hasDiagnostics(_ device: CMIODeviceID) -> Bool {
    var addr = address(0x6364_6961) // 'cdia'
    return CMIOObjectHasProperty(device, &addr)
}

// CoreMediaIO directions are seen from the host, like audio devices:
//   1 = input  -> frames flow out of the device to the app = extension `.source`
//   0 = output -> frames flow from the app into the device = extension `.sink`
// Versions up to 1.0.4 had these swapped, so the helper started and filled the
// source (what Telegram reads) instead of the sink: the extension never called
// startSink (ext_starts=0), never received a frame (ext_rx=0), the queue filled
// with waiting images and the helper exited with code 5 (EPIPE on the app side).
func pickStreams(_ device: CMIODeviceID) -> Camera? {
    let streams = objectIDs(kCMIODevicePropertyStreams, of: device)
    let described = streams.map { "\($0):\(name(of: $0) ?? "?"):dir=\(direction(of: $0).map(String.init) ?? "?")" }
    let sink = streams.first(where: { name(of: $0) == sinkStreamName })
        ?? streams.first(where: { direction(of: $0) == 0 })
    let source = streams.first(where: { name(of: $0) == sourceStreamName && $0 != sink })
        ?? streams.first(where: { direction(of: $0) == 1 && $0 != sink })
    guard let sinkID = sink, let sourceID = source, sinkID != sourceID else {
        log("streams invalides sur le peripherique \(device): \(described.joined(separator: ", "))")
        return nil
    }
    log("streams device=\(device) source=\(sourceID) sink=\(sinkID) [\(described.joined(separator: ", "))]")
    return Camera(device: device, source: sourceID, sink: sinkID)
}

func findCamera(timeout: TimeInterval) -> Camera? {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        let candidates = objectIDs(kCMIOHardwarePropertyDevices, of: CMIOObjectID(kCMIOObjectSystemObject))
            .filter(isChapCam)
        // A superseded extension (e.g. 1.0.3 "en attente de desinstallation")
        // can still publish a device until reboot: use the current one, which
        // is the one exposing the diagnostics property.
        let ordered = candidates.filter(hasDiagnostics) + candidates.filter { !hasDiagnostics($0) }
        if candidates.count > 1 {
            log("plusieurs ChapCam Camera: \(candidates.map { "\($0)\(hasDiagnostics($0) ? "(actuelle)" : "(ancienne)")" }.joined(separator: " "))")
        }
        for device in ordered {
            if let camera = pickStreams(device) { return camera }
        }
        RunLoop.current.run(until: Date().addingTimeInterval(0.25))
    } while Date() < deadline
    return nil
}

func extensionCounter(_ device: CMIODeviceID, _ key: String) -> Int? {
    for pair in extensionDiagnostics(device).split(separator: " ") {
        let parts = pair.split(separator: "=", maxSplits: 1)
        if parts.count == 2, parts[0] == "ext_\(key)" { return Int(parts[1]) }
    }
    return nil
}

// Counters published by the extension (custom property 'cdia', see Provider.swift),
// e.g. "rx=120 rej=0 err=0 auth=1 starts=1 sink=1 src=1 real=118 wait=40 fresh=1 issue=none".
// Returned with an "ext_" prefix so the app can parse it next to the helper stats.
func extensionDiagnostics(_ device: CMIODeviceID) -> String {
    var addr = address(0x6364_6961) // 'cdia'
    guard CMIOObjectHasProperty(device, &addr) else { return "ext_diag=unsupported" }
    var value: Unmanaged<CFString>?
    var used: UInt32 = 0
    let size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    let status = withUnsafeMutablePointer(to: &value) {
        CMIOObjectGetPropertyData(device, &addr, 0, nil, size, &used, $0)
    }
    guard status == noErr, let cf = value else { return "ext_diag=error-\(status)" }
    let text = cf.takeRetainedValue() as String
    return text.split(separator: " ").map { "ext_\($0)" }.joined(separator: " ")
}

// True when at least one process (Telegram, Zoom...) reads ChapCam Camera.
func isRunningSomewhere(_ device: CMIODeviceID) -> Bool {
    var addr = address(kCMIODevicePropertyDeviceIsRunningSomewhere)
    var value: UInt32 = 0
    var used: UInt32 = 0
    let status = CMIOObjectGetPropertyData(device, &addr, 0, nil, UInt32(MemoryLayout<UInt32>.size), &used, &value)
    return status == noErr && value != 0
}

final class StreamCounters {
    private let lock = NSLock()
    private var received = 0
    private var enqueued = 0
    private var queueFull = 0
    private var failed = 0

    func add(received r: Int = 0, enqueued e: Int = 0, queueFull q: Int = 0, failed f: Int = 0) {
        lock.lock()
        received += r
        enqueued += e
        queueFull += q
        failed += f
        lock.unlock()
    }

    func drain() -> (received: Int, enqueued: Int, queueFull: Int, failed: Int) {
        lock.lock()
        defer {
            received = 0
            enqueued = 0
            queueFull = 0
            failed = 0
            lock.unlock()
        }
        return (received, enqueued, queueFull, failed)
    }
}

func readExact(_ pointer: UnsafeMutableRawPointer, _ count: Int) -> Bool {
    var offset = 0
    while offset < count {
        let n = read(STDIN_FILENO, pointer + offset, count - offset)
        if n <= 0 { return false }
        offset += n
    }
    return true
}

func stream(width: Int, height: Int, fps: Int) -> Int32 {
    guard let camera = findCamera(timeout: 15) else {
        log("ChapCam Camera introuvable. Verifie que l'extension camera est autorisee dans Reglages Systeme.")
        return 3
    }

    var queueRef: Unmanaged<CMSimpleQueue>?
    let queueStatus = CMIOStreamCopyBufferQueue(camera.sink, { _, _, _ in }, nil, &queueRef)
    guard queueStatus == noErr, let queue = queueRef?.takeRetainedValue() else {
        log("CMIOStreamCopyBufferQueue failed: \(queueStatus)")
        return 1
    }
    log("sink queue capacity=\(CMSimpleQueueGetCapacity(queue)) camera-access=\(cameraAuthorization())")
    let startsBefore = extensionCounter(camera.device, "starts")
    let startStatus = CMIODeviceStartStream(camera.device, camera.sink)
    guard startStatus == noErr else {
        log("CMIODeviceStartStream failed: \(startStatus)")
        return 1
    }
    defer { CMIODeviceStopStream(camera.device, camera.sink) }

    // CMIODeviceStartStream returning noErr is not proof: require the extension
    // itself to report that its sink started, otherwise fail loudly (code 7).
    if let before = startsBefore {
        let deadline = Date().addingTimeInterval(3)
        var started = false
        while Date() < deadline {
            if let now = extensionCounter(camera.device, "starts"), now > before { started = true; break }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        guard started else {
            log("sink-not-started: l'extension n'a pas demarre son flux d'entree. extension \(extensionDiagnostics(camera.device))")
            return 7
        }
    } else {
        log("extension sans diagnostics (ancienne version chargee) : redemarre le Mac")
    }
    log("extension \(extensionDiagnostics(camera.device))")

    var pool: CVPixelBufferPool?
    let poolAttributes: NSDictionary = [
        kCVPixelBufferWidthKey: width,
        kCVPixelBufferHeightKey: height,
        kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
        kCVPixelBufferIOSurfacePropertiesKey: [:] as NSDictionary,
    ]
    CVPixelBufferPoolCreate(kCFAllocatorDefault, nil, poolAttributes, &pool)
    guard let pixelPool = pool else {
        log("CVPixelBufferPoolCreate failed")
        return 1
    }

    // Same description as the extension's advertised format: one created from
    // the image buffer carries extra extensions (row bytes, color tags) that do
    // not match the sink's active format.
    var sinkFormat: CMFormatDescription?
    CMVideoFormatDescriptionCreate(
        allocator: kCFAllocatorDefault, codecType: kCVPixelFormatType_32BGRA,
        width: Int32(width), height: Int32(height), extensions: nil, formatDescriptionOut: &sinkFormat)
    guard let formatDescription = sinkFormat else {
        log("CMVideoFormatDescriptionCreate failed")
        return 1
    }

    let rowBytes = width * 4
    var frame = [UInt8](repeating: 0, count: rowBytes * height)
    let frameDuration = CMTime(value: 1, timescale: CMTimeScale(max(1, fps)))
    log("connected \(width)x\(height) -> \(deviceName)")

    // Stats run on their own timer so they keep coming when ChapCam sends nothing.
    let counters = StreamCounters()
    var stalledSeconds = 0
    let statsTimer = DispatchSource.makeTimerSource(queue: DispatchQueue(label: "com.chapcam.vcam.stats"))
    statsTimer.schedule(deadline: .now() + 1, repeating: 1)
    statsTimer.setEventHandler {
        let s = counters.drain()
        let readers = isRunningSomewhere(camera.device) ? 1 : 0
        log("stats in=\(s.received) enq=\(s.enqueued) full=\(s.queueFull) err=\(s.failed) readers=\(readers) " +
            extensionDiagnostics(camera.device))
        // The extension drains the sink queue as soon as it runs. A queue that
        // stays full means the extension was replaced or stopped: reconnect.
        stalledSeconds = (s.enqueued == 0 && s.queueFull > 0) ? stalledSeconds + 1 : 0
        if stalledSeconds >= 5 {
            log("Extension camera ne consomme plus les images, reconnexion")
            CMIODeviceStopStream(camera.device, camera.sink)
            exit(5)
        }
    }
    statsTimer.resume()

    while frame.withUnsafeMutableBytes({ readExact($0.baseAddress!, $0.count) }) {
        counters.add(received: 1)
        if CMSimpleQueueGetCount(queue) >= CMSimpleQueueGetCapacity(queue) {
            counters.add(queueFull: 1)
            continue
        }

        var pixelBuffer: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pixelPool, &pixelBuffer) == kCVReturnSuccess,
              let buffer = pixelBuffer else {
            counters.add(failed: 1)
            continue
        }
        CVPixelBufferLockBaseAddress(buffer, [])
        if let destination = CVPixelBufferGetBaseAddress(buffer) {
            let destinationStride = CVPixelBufferGetBytesPerRow(buffer)
            frame.withUnsafeBytes { source in
                for y in 0..<height {
                    memcpy(destination + y * destinationStride, source.baseAddress! + y * rowBytes, rowBytes)
                }
            }
        }
        CVPixelBufferUnlockBaseAddress(buffer, [])

        var timing = CMSampleTimingInfo(
            duration: frameDuration,
            presentationTimeStamp: CMClockGetTime(CMClockGetHostTimeClock()),
            decodeTimeStamp: .invalid
        )
        var sampleBuffer: CMSampleBuffer?
        guard CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault, imageBuffer: buffer, formatDescription: formatDescription,
            sampleTiming: &timing, sampleBufferOut: &sampleBuffer) == noErr,
            let sample = sampleBuffer else {
            counters.add(failed: 1)
            continue
        }
        let element = Unmanaged.passRetained(sample)
        if CMSimpleQueueEnqueue(queue, element: element.toOpaque()) == noErr {
            counters.add(enqueued: 1)
        } else {
            element.release()
            counters.add(queueFull: 1)
        }
    }
    statsTimer.cancel()
    return 0
}

func cameraAuthorization() -> String {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "not-determined"
    @unknown default: return "unknown"
    }
}

func isPlaceholderPixel(_ p: UnsafePointer<UInt8>) -> Bool {
    abs(Int(p[0]) - Int(kPlaceholder.b)) <= 6 && abs(Int(p[1]) - Int(kPlaceholder.g)) <= 6 &&
        abs(Int(p[2]) - Int(kPlaceholder.r)) <= 6
}

// Must match kPlaceholderBGRA in CameraExtension/Provider.swift.
let kPlaceholder: (b: UInt8, g: UInt8, r: UInt8) = (0x3D, 0x1A, 0x12)

final class FrameProbe: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    private let lock = NSLock()
    private(set) var frames = 0
    private(set) var real = 0
    private(set) var placeholder = 0
    private(set) var size = ""

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let image = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let width = CVPixelBufferGetWidth(image)
        let height = CVPixelBufferGetHeight(image)
        CVPixelBufferLockBaseAddress(image, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(image, .readOnly) }
        guard CVPixelBufferGetPixelFormatType(image) == kCVPixelFormatType_32BGRA,
              let base = CVPixelBufferGetBaseAddress(image) else { return }
        let stride = CVPixelBufferGetBytesPerRow(image)
        let corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
        let waiting = corners.allSatisfy { x, y in
            isPlaceholderPixel(base.advanced(by: y * stride + x * 4).assumingMemoryBound(to: UInt8.self))
        }
        lock.lock()
        frames += 1
        if waiting { placeholder += 1 } else { real += 1 }
        size = "\(width)x\(height)"
        lock.unlock()
    }

    func summary() -> String {
        lock.lock()
        defer { lock.unlock() }
        return "frames=\(frames) real=\(real) placeholder=\(placeholder) size=\(size)"
    }
}

// Reads ChapCam Camera through AVFoundation, the API Telegram, FaceTime and
// Zoom use, so the result matches what those apps actually display.
func verifyWithAVFoundation(seconds: Double) -> Int32? {
    let types: [AVCaptureDevice.DeviceType]
    if #available(macOS 14.0, *) {
        types = [.external]
    } else {
        types = [.externalUnknown]
    }
    let devices = AVCaptureDevice.DiscoverySession(deviceTypes: types, mediaType: .video, position: .unspecified).devices
    guard let device = devices.first(where: { $0.uniqueID.uppercased() == deviceUID || $0.localizedName == deviceName }) else {
        log("verify: ChapCam Camera absent d'AVFoundation")
        return nil
    }
    let access = cameraAuthorization()
    guard access == "authorized" else {
        print("verify frames=0 real=0 placeholder=0 error=camera-\(access) via=avfoundation")
        return 6
    }
    let session = AVCaptureSession()
    guard let input = try? AVCaptureDeviceInput(device: device), session.canAddInput(input) else {
        print("verify frames=0 real=0 placeholder=0 error=input via=avfoundation")
        return 1
    }
    session.addInput(input)
    let output = AVCaptureVideoDataOutput()
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    output.alwaysDiscardsLateVideoFrames = true
    let probe = FrameProbe()
    output.setSampleBufferDelegate(probe, queue: DispatchQueue(label: "com.chapcam.vcam.verify"))
    guard session.canAddOutput(output) else {
        print("verify frames=0 real=0 placeholder=0 error=output via=avfoundation")
        return 1
    }
    session.addOutput(output)
    session.startRunning()
    RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    session.stopRunning()
    print("verify \(probe.summary()) via=avfoundation")
    return probe.frames > 0 ? 0 : 4
}

// Fallback: reads the output stream through the CoreMediaIO C API.
func verify(seconds: Double) -> Int32 {
    guard let camera = findCamera(timeout: 10) else {
        print("verify frames=0 real=0 placeholder=0 error=not-found")
        return 3
    }
    var queueRef: Unmanaged<CMSimpleQueue>?
    let queueStatus = CMIOStreamCopyBufferQueue(camera.source, { _, _, _ in }, nil, &queueRef)
    guard queueStatus == noErr, let queue = queueRef?.takeRetainedValue() else {
        print("verify frames=0 real=0 placeholder=0 error=queue-\(queueStatus)")
        return 1
    }
    let startStatus = CMIODeviceStartStream(camera.device, camera.source)
    guard startStatus == noErr else {
        print("verify frames=0 real=0 placeholder=0 error=start-\(startStatus)")
        return 1
    }
    defer { CMIODeviceStopStream(camera.device, camera.source) }

    var frames = 0
    var real = 0
    var placeholder = 0
    var size = ""
    let deadline = Date().addingTimeInterval(seconds)
    while Date() < deadline {
        guard let element = CMSimpleQueueDequeue(queue) else {
            usleep(10_000)
            continue
        }
        let sample = Unmanaged<CMSampleBuffer>.fromOpaque(element).takeRetainedValue()
        guard let image = CMSampleBufferGetImageBuffer(sample) else { continue }
        frames += 1
        let width = CVPixelBufferGetWidth(image)
        let height = CVPixelBufferGetHeight(image)
        size = "\(width)x\(height)"
        CVPixelBufferLockBaseAddress(image, .readOnly)
        if let base = CVPixelBufferGetBaseAddress(image) {
            let stride = CVPixelBufferGetBytesPerRow(image)
            let corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
            let isPlaceholder = corners.allSatisfy { x, y in
                let p = base.advanced(by: y * stride + x * 4).assumingMemoryBound(to: UInt8.self)
                return p[0] == 0x3D && p[1] == 0x1A && p[2] == 0x12
            }
            if isPlaceholder { placeholder += 1 } else { real += 1 }
        }
        CVPixelBufferUnlockBaseAddress(image, .readOnly)
    }
    print("verify frames=\(frames) real=\(real) placeholder=\(placeholder) size=\(size) via=cmio")
    return frames > 0 ? 0 : 4
}

useInternalCMIOThread()
discoverExtensionCameras()

let args = CommandLine.arguments
switch args.count > 1 ? args[1] : "" {
case "probe", "status":
    // The extension is launched on demand by the system; give it time to publish.
    let found = findCamera(timeout: 8) != nil
    print("devices: \(deviceNames().joined(separator: " | "))")
    exit(found ? 0 : 3)
case "stream" where args.count >= 5:
    exit(stream(width: Int(args[2]) ?? 1280, height: Int(args[3]) ?? 720, fps: Int(args[4]) ?? 30))
case "verify":
    let seconds = args.count > 2 ? Double(args[2]) ?? 2.5 : 2.5
    exit(verifyWithAVFoundation(seconds: seconds) ?? verify(seconds: seconds))
case "diag":
    guard let camera = findCamera(timeout: 8) else {
        print("diag error=not-found")
        exit(3)
    }
    print("diag camera-access=\(cameraAuthorization()) readers=\(isRunningSomewhere(camera.device) ? 1 : 0) \(extensionDiagnostics(camera.device))")
    exit(0)
default:
    log("usage: chapcam-vcam-mac probe | stream W H FPS | verify [SECONDS] | diag")
    exit(1)
}
