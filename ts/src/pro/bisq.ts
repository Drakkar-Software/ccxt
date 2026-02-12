//  ---------------------------------------------------------------------------

import bisqRest from '../bisq.js';

//  ---------------------------------------------------------------------------

export default class bisq extends bisqRest {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'has': {
                'ws': false,
            },
            'urls': {},
            'options': {},
            'streaming': {},
            'exceptions': {
                'ws': {
                    'exact': {
                    },
                },
            },
        });
    }
}
