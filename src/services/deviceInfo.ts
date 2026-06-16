import DeviceInfo from 'react-native-device-info';

export interface DeviceInformation {
  manufacturer: string;
  model: string;
}

export const getDeviceInfo = async (): Promise<DeviceInformation> => {
  try {
    const [manufacturer, model] = await Promise.all([
      DeviceInfo.getManufacturer(),
      DeviceInfo.getModel(),
    ]);

    return {
      manufacturer: manufacturer || 'Unknown',
      model: model || 'Unknown',
    };
  } catch (error) {
    console.warn('Error obteniendo información del dispositivo:', error);
    return {
      manufacturer: 'Unknown',
      model: 'Unknown',
    };
  }
};
