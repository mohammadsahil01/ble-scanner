import { PermissionsAndroid } from "react-native";

import { request, PERMISSIONS, RESULTS } from "react-native-permissions";

export const requestBluetoothPermission = async () => {
  try {
    const result = await request(
      Platform.select({
        ios: PERMISSIONS.IOS.BLUETOOTH,
        android: PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      })
    );
    return result;
  } catch (error) {
    console.error("Error requesting Bluetooth permission:", error);
    return RESULTS.DENIED;
  }
};
