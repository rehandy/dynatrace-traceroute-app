/**
 * @jest-environment @dynatrace/runtime-simulator/lib/test-environment
 */

import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import sampleAction from './sample-action.action';

enableFetchMocks();

describe('sample-action', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('should produce expected results', async () => {
    fetchMock.mockResponse(
      JSON.stringify({
        schemaId: 'sample-action-connection',
        value: {
          name: 'My Connection',
          token: 'abc123',
          url: 'https://foo.bar',
        },
        summary: 'My Connection',
      }),
    );
    const result = await sampleAction({ name: 'Mark', connectionId: 'sample-action-connection-object-id' });
    expect(result).toEqual({ message: 'Hello Mark!' });
    expect.assertions(1);
  });
});
