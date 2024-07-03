import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Button,
  Platform,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";

const manager = new BleManager();

const getSignalStrength = (rssi) => {
  if (rssi >= -60) return "Excellent";
  if (rssi >= -70) return "Good";
  return "Poor";
};

export default function App() {
  const [devices, setDevices] = useState({});
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const subscription = manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        checkPermissions();
      }
    }, true);

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let signalInterval, refreshInterval;

    if (scanning) {
      signalInterval = setInterval(updateSignalStrength, 1000);
      refreshInterval = setInterval(refreshDeviceList, 5000);
    } else {
      clearInterval(signalInterval);
      clearInterval(refreshInterval);
    }

    return () => {
      clearInterval(signalInterval);
      clearInterval(refreshInterval);
    };
  }, [scanning]);

  const checkPermissions = async () => {
    try {
      const permissionStatus = await requestBluetoothPermission();
      if (permissionStatus === RESULTS.GRANTED) {
        scanAndConnect();
      } else {
        console.log("Bluetooth permission not granted");
      }
    } catch (error) {
      console.log("Error requesting Bluetooth permissions:", error);
    }
  };

  const requestBluetoothPermission = async () => {
    try {
      const result = await request(
        Platform.select({
          ios: PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL,
          android: PERMISSIONS.ANDROID.BLUETOOTH_SCAN, // Adjust as per Android requirement
        })
      );
      return result;
    } catch (error) {
      console.error("Error requesting Bluetooth permission:", error);
      return RESULTS.DENIED;
    }
  };

  const scanAndConnect = () => {
    if (scanning) return;

    setScanning(true);
    setDevices({});

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Scan error:", error);
        setScanning(false);
        return;
      }

      setDevices((prevDevices) => ({
        ...prevDevices,
        [device.id]: {
          id: device.id,
          name: device.name || "Unknown",
          rssi: device.rssi,
          strength: getSignalStrength(device.rssi),
          lastUpdated: Date.now(),
        },
      }));
    });
  };

  const updateSignalStrength = () => {
    Object.keys(devices).forEach((deviceId) => {
      manager
        .readRSSIForDevice(deviceId)
        .then((device) => {
          setDevices((prevDevices) => ({
            ...prevDevices,
            [deviceId]: {
              ...prevDevices[deviceId],
              rssi: device.rssi,
              strength: getSignalStrength(device.rssi),
              lastUpdated: Date.now(),
            },
          }));
        })
        .catch((error) => {
          console.log(`Error reading RSSI for device ${deviceId}:`, error);
        });
    });
  };

  const refreshDeviceList = () => {
    setDevices({});
  };

  const stopScan = () => {
    manager.stopDeviceScan();
    setScanning(false);
  };

  const renderDevice = ({ item }) => (
    <View style={styles.device}>
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>
      <Text
        style={[
          styles.deviceStrength,
          {
            color:
              item.strength === "Excellent"
                ? "green"
                : item.strength === "Good"
                ? "orange"
                : "red",
          },
        ]}
      >
        Signal: {item.strength}
      </Text>
      <Text style={styles.lastUpdated}>
        Last updated: {new Date(item.lastUpdated).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Button
        title={scanning ? "Stop Scan" : "Start Scan"}
        onPress={scanning ? stopScan : checkPermissions}
      />
      {scanning && (
        <FlatList
          data={Object.values(devices)}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
    paddingTop: 50,
  },
  device: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#DDDDDD",
    borderRadius: 5,
    width: 300,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  deviceRssi: {
    fontSize: 12,
  },
  deviceStrength: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
  },
  lastUpdated: {
    fontSize: 10,
    color: "#666",
    marginTop: 5,
  },
});
