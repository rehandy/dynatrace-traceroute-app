const fetchMock = jest.fn();
globalThis.fetch = fetchMock;

import deleteScheduleFunction from './deleteSchedule.function';

describe('deleteSchedule.function', () => {
  it('should return an object with a message property', async () => {
    // An example of how to overwrite the implementation of fetch within a test.
    fetchMock.mockImplementationOnce(() => {
      throw new Error('fetch should not be called in this function');
    });
    const result = await deleteScheduleFunction();
    expect(result).toEqual('Hello world');
    expect(fetchMock).not.toHaveBeenCalled();
    expect.assertions(2);
  });
});
