import CoreMediaIO
import Foundation

vcamLog.notice("ChapCam Camera extension launching (pid \(getpid(), privacy: .public))")
let providerSource = ChapCamProviderSource(clientQueue: nil)
CMIOExtensionProvider.startService(provider: providerSource.provider)
vcamLog.notice("ChapCam Camera provider service started")
CFRunLoopRun()
