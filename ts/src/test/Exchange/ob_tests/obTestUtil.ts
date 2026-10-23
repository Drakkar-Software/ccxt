import assert from 'assert';

export default function assertObExchangeId (exchange: { id: string }, expectedId: string) {
    assert.strictEqual (exchange.id, expectedId);
}
