/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App, { performAppExit } from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('exits immediately without waiting for logout to finish', async () => {
  const logoutMock = jest.fn(
    () => new Promise<void>(resolve => setTimeout(resolve, 10000)),
  );
  const clearLocalSessionDataMock = jest.fn(async () => undefined);
  const exitAppMock = jest.fn();
  const resetStateMock = jest.fn();

  await performAppExit({
    shouldLogout: true,
    authToken: 'token-123',
    logoutFn: logoutMock,
    clearLocalSessionDataFn: clearLocalSessionDataMock,
    exitAppFn: exitAppMock,
    onResetState: resetStateMock,
    logoutTimeoutMs: 200,
  });

  expect(logoutMock).toHaveBeenCalledWith('token-123');
  expect(clearLocalSessionDataMock).toHaveBeenCalledTimes(1);
  expect(exitAppMock).toHaveBeenCalledTimes(1);
  expect(resetStateMock).toHaveBeenCalledTimes(1);
});
