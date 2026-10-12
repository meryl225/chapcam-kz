// Node-API addon loaded by the Electron main process. OSSystemExtensionRequest
// must be issued by the app that embeds the extension (and holds the
// com.apple.developer.system-extension.install entitlement), so it cannot live
// in a separate helper executable.
#import <Foundation/Foundation.h>
#import <SystemExtensions/SystemExtensions.h>
#include <node_api.h>

#include <string>

struct Pending {
  napi_deferred deferred;
  napi_threadsafe_function tsfn;
};

struct Outcome {
  bool ok;
  std::string value;
};

static void CallJs(napi_env env, napi_value, void* context, void* data) {
  auto* pending = static_cast<Pending*>(context);
  auto* outcome = static_cast<Outcome*>(data);
  if (env && pending && outcome) {
    napi_value message;
    napi_create_string_utf8(env, outcome->value.c_str(), NAPI_AUTO_LENGTH, &message);
    if (outcome->ok) {
      napi_resolve_deferred(env, pending->deferred, message);
    } else {
      napi_value error;
      napi_create_error(env, nullptr, message, &error);
      napi_reject_deferred(env, pending->deferred, error);
    }
  }
  delete outcome;
}

static void FinalizePending(napi_env, void* data, void*) { delete static_cast<Pending*>(data); }

@interface ChapCamExtensionDelegate : NSObject <OSSystemExtensionRequestDelegate>
@property(nonatomic, assign) Pending* pending;
@property(nonatomic, assign) BOOL settled;
@end

@implementation ChapCamExtensionDelegate
- (void)settle:(bool)ok value:(NSString*)value {
  if (self.settled) return;
  self.settled = YES;
  auto* outcome = new Outcome{ok, std::string(value.UTF8String ?: "")};
  napi_call_threadsafe_function(self.pending->tsfn, outcome, napi_tsfn_blocking);
  napi_release_threadsafe_function(self.pending->tsfn, napi_tsfn_release);
}

- (OSSystemExtensionReplacementAction)request:(OSSystemExtensionRequest*)request
                  actionForReplacingExtension:(OSSystemExtensionProperties*)existing
                                withExtension:(OSSystemExtensionProperties*)extension {
  return OSSystemExtensionReplacementActionReplace;
}

- (void)requestNeedsUserApproval:(OSSystemExtensionRequest*)request {
  [self settle:true value:@"needs-approval"];
}

- (void)request:(OSSystemExtensionRequest*)request didFinishWithResult:(OSSystemExtensionRequestResult)result {
  [self settle:true
         value:result == OSSystemExtensionRequestWillCompleteAfterReboot ? @"reboot-required" : @"activated"];
}

- (void)request:(OSSystemExtensionRequest*)request didFailWithError:(NSError*)error {
  [self settle:false value:error.localizedDescription ?: @"Unknown system extension error"];
}
@end

// Delegates must outlive the request; they are tiny and few, so keep them.
static NSMutableArray* gDelegates = nil;

static napi_value Submit(napi_env env, napi_callback_info info, bool activate) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 1) {
    napi_throw_type_error(env, nullptr, "Extension bundle identifier required");
    return nullptr;
  }
  char identifier[256] = {};
  size_t length = 0;
  napi_get_value_string_utf8(env, argv[0], identifier, sizeof(identifier), &length);

  napi_value promise;
  auto* pending = new Pending{};
  napi_create_promise(env, &pending->deferred, &promise);

  napi_value resourceName;
  napi_create_string_utf8(env, "ChapCamSystemExtension", NAPI_AUTO_LENGTH, &resourceName);
  napi_create_threadsafe_function(env, nullptr, nullptr, resourceName, 0, 1, pending, FinalizePending, pending,
                                  CallJs, &pending->tsfn);

  NSString* bundleId = [NSString stringWithUTF8String:identifier];
  dispatch_async(dispatch_get_main_queue(), ^{
    ChapCamExtensionDelegate* delegate = [ChapCamExtensionDelegate new];
    delegate.pending = pending;
    if (!gDelegates) gDelegates = [NSMutableArray new];
    [gDelegates addObject:delegate];

    OSSystemExtensionRequest* request =
        activate ? [OSSystemExtensionRequest activationRequestForExtension:bundleId queue:dispatch_get_main_queue()]
                 : [OSSystemExtensionRequest deactivationRequestForExtension:bundleId queue:dispatch_get_main_queue()];
    request.delegate = delegate;
    [[OSSystemExtensionManager sharedManager] submitRequest:request];
  });
  return promise;
}

static napi_value Activate(napi_env env, napi_callback_info info) { return Submit(env, info, true); }
static napi_value Deactivate(napi_env env, napi_callback_info info) { return Submit(env, info, false); }

NAPI_MODULE_INIT() {
  napi_property_descriptor properties[] = {
      {"activate", nullptr, Activate, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"deactivate", nullptr, Deactivate, nullptr, nullptr, nullptr, napi_default, nullptr},
  };
  napi_define_properties(env, exports, 2, properties);
  return exports;
}
