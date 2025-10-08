import { IntentPayload } from '@dynatrace-sdk/navigation';
import { mockNavigation } from '@dynatrace-sdk/navigation/testing';
import { render, screen } from '@dynatrace/strato-components-preview/testing';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import React from 'react';
import SampleActionWidget from './sample-action.widget';

enableFetchMocks();

describe('SampleActionWidget', () => {
  beforeEach(() => {
    fetchMock.resetMocks();

    // Mock the `getIntentLink` value to be a valid URL.
    mockNavigation({
      getIntentLink: (intentPayload: IntentPayload, appId?: string, intentId?: string) => 'https://mock.url',
    });
  });

  it('should render a widget with values', async () => {
    // Mock settings objects response value.
    fetchMock.mockIf(
      new RegExp('/platform/app-settings/v2/objects'),
      JSON.stringify({
        items: [
          {
            objectId: 'sample-action-connection-object-id',
            summary: 'My Connection',
          },
        ],
        totalCount: 1,
        pageSize: 100,
      }),
    );
    render(
      <SampleActionWidget
        value={{ name: 'Mark', connectionId: 'sample-action-connection-object-id' }}
        onValueChanged={jest.fn()}
      />
    );

    expect(screen.getByText('Mark')).toBeTruthy();
    expect(await screen.findByText('My Connection')).toBeTruthy();
  });
});
