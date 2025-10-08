/**
 * @jest-environment @dynatrace/runtime-simulator/lib/test-environment
 */

import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import runTraceroute from './runTraceroute.action';

enableFetchMocks();

describe('runTraceroute', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('should produce expected results', async () => {
    fetchMock.mockResponse(
      JSON.stringify({
        schemaId: 'runTraceroute-connection',
        value: {
          name: 'My Connection',
          token: 'abc123',
          url: 'https://foo.bar',
        },
        summary: 'My Connection',
      }),
    );
    const result = await runTraceroute({ name: 'Mark', connectionId: 'runTraceroute-connection-object-id' });
    expect(result).toEqual({ message: 'Hello Mark!' });
    expect.assertions(1);
  });
});
