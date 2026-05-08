// WebSocket cache type stubs — WIP pending full WS implementation
// These mirror js/src/base/ws/Cache.ts types as Value-based stubs.
// `new` returns Value::Undefined so it can be stored in Value variables.

use crate::exchange::Value;

macro_rules! array_cache_stub {
    ($name:ident) => {
        #[derive(Debug, Clone, Default)]
        pub struct $name;

        impl $name {
            pub fn new() -> Value { Value::Undefined }
        }
    };
}

array_cache_stub!(ArrayCache);
array_cache_stub!(ArrayCacheByTimestamp);
array_cache_stub!(ArrayCacheBySymbolById);
array_cache_stub!(ArrayCacheBySymbolBySide);
