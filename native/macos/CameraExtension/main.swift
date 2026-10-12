import CoreMediaIO
import Foundation

let providerSource = ChapCamProviderSource(clientQueue: nil)
CMIOExtensionProvider.startService(provider: providerSource.provider)
CFRunLoopRun()
