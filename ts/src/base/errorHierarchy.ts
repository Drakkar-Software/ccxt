const errorHierarchy = {
    'BaseError': {
        'ExchangeError': {
            'AuthenticationError': {
                'PermissionDenied': {
                    'AccountNotEnabled': {},
                },
                'AccountSuspended': {},
                'OBIPWhitelistError': {},
            },
            'ArgumentsRequired': {},
            'BadRequest': {
                'BadSymbol': {},
                'OBUntradableSymbol': {},
                'OBClosedPositionError': {},
                'OBOrderUncancellableError': {},
                'OBInternalSyncError': {},
                'OBMaxOpenOrdersReached': {},
            },
            'OperationRejected': {
                'NoChange': {
                    'MarginModeAlreadySet': {},
                },
                'MarketClosed': {},
                'ManualInteractionNeeded': {},
                'RestrictedLocation': {},
            },
            'InsufficientFunds': {},
            'InvalidAddress': {
                'AddressPending': {},
            },
            'InvalidOrder': {
                'OrderNotFound': {},
                'OrderNotCached': {},
                'OrderImmediatelyFillable': {},
                'OrderNotFillable': {},
                'DuplicateOrderId': {},
                'ContractUnavailable': {},
            },
            'NotSupported': {},
            'InvalidProxySettings': {},
            'ExchangeClosedByUser': {},
        },
        'OperationFailed': {
            'NetworkError': {
                'DDoSProtection': {},
                'RateLimitExceeded': {},
                'ExchangeNotAvailable': {
                    'OnMaintenance': {},
                },
                'InvalidNonce': {
                    'ChecksumError': {},
                },
                'RequestTimeout': {},
            },
            'BadResponse': {
                'NullResponse': {},
            },
            'CancelPending': {},
        },
        'UnsubscribeError': {},
    },
};

export default errorHierarchy;
