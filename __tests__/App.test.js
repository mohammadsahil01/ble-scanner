import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import App from "../App";
import { BleManager } from "react-native-ble-plx";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";

// Mocking react-native-ble-plx
jest.mock("react-native-ble-plx", () => {
  return {
    BleManager: jest.fn().mockImplementation(() => {
      return {
        onStateChange: jest.fn().mockReturnValue({ remove: jest.fn() }),
        startDeviceScan: jest.fn((filter, options, callback) => {
          setTimeout(() => {
            callback(null, { id: "1", name: "Test Device", rssi: -50 });
          }, 100);
        }),
        stopDeviceScan: jest.fn(),
        readRSSIForDevice: jest.fn().mockResolvedValue({ id: "1", rssi: -50 }),
      };
    }),
  };
});

// Mocking react-native-permissions
jest.mock("react-native-permissions", () => {
  return {
    request: jest.fn(),
    PERMISSIONS: {
      IOS: {
        BLUETOOTH: "ios.permission.BLUETOOTH",
      },
      ANDROID: {
        BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
      },
    },
    RESULTS: {
      GRANTED: "granted",
      DENIED: "denied",
    },
  };
});

describe("App", () => {
  it("Renders the App correctly", () => {
    const { getByText } = render(<App />);
    expect(getByText("Start Scan")).toBeTruthy();
  });

  it("Starts and Stops scanning", async () => {
    const { getByText } = render(<App />);
    const startButton = getByText("Start Scan");

    // Mock permissions
    request.mockResolvedValue(RESULTS.GRANTED);

    // Start scanning
    fireEvent.press(startButton);
    expect(await waitFor(() => getByText("Stop Scan"))).toBeTruthy();

    // Stop scanning
    const stopButton = getByText("Stop Scan");
    fireEvent.press(stopButton);
    expect(await waitFor(() => getByText("Start Scan"))).toBeTruthy();
  });

  it("Displays Devices", async () => {
    const { getByText } = render(<App />);
    const startButton = getByText("Start Scan");

    // Mock permissions
    request.mockResolvedValue(RESULTS.GRANTED);

    // Start scanning
    fireEvent.press(startButton);
    await waitFor(() => expect(getByText("Test Device")).toBeTruthy());
    expect(getByText("RSSI: -50")).toBeTruthy();
    expect(getByText("Signal: Excellent")).toBeTruthy();
  });
});
