# homebridge-roomba-stv
homebridge-plugin for Roomba 9xx (Roomba 900 Software Version 2.x).

[![npm version](https://badge.fury.io/js/homebridge-roomba-stv.svg)](https://badge.fury.io/js/homebridge-roomba-stv)
[![dependencies Status](https://david-dm.org/esteban-mallen/homebridge-roomba-stv/status.svg)](https://david-dm.org/esteban-mallen/homebridge-roomba-stv)

### Features:
- Roomba start on demand
- Roomba stop and dock on demand
- Roomba charging status
- Roomba battery level (with low battery warning)

### Credits to:

https://github.com/umesan/homebridge-roomba

https://github.com/steedferns/homebridge-roomba980

https://github.com/gbro115/homebridge-roomba690

 [@matanelgabsi](https://github.com/matanelgabsi) for keepAlive feature

## Installation:

### 1. Install homebridge and Roomba plugin.
- 1.a `sudo npm install -g homebridge --unsafe-perm`
- 1.b `sudo npm install -g homebridge-roomba-stv`

### 2. Find robotpwd and blid.
- 2.a Run `cd $(npm -g prefix)/lib/node_modules/homebridge-roomba-stv`
- 2.b Run `sudo npm run getrobotpwd 192.168.xxx.xxx` using the IP address of your Roomba
- 2.c Follow on-screen instructions

If successful, the following message will be displayed.

Please check **blid** and **Password** of displayed message.

```
Robot Data:
{ ver: '2',
  hostname: 'Roomba-xxxxxxxxxxxxxxxx',
  robotname: 'Your Roomba’s Name',
  ip: '192.168.xxx.xxx',
  mac: 'xx:xx:xx:xx:xx:xx',
  sw: 'vx.x.x-x',
  sku: 'R98----',
  nc: 0,
  proto: 'mqtt',
  blid: '0123456789abcdef' }
Password=> :1:2345678910:ABCDEFGHIJKLMNOP <= Yes, all this string.
```

If failed, you may safely try again anytime.

### 4. Update homebridge configuration file.
```
"accessories": [
  {
    "accessory": "Roomba",
    "name": "Roomba",
    "model": "960",
    "blid": "0123456789abcdef", // From above
    "robotpwd": ":1:2345678910:ABCDEFGHIJKLMNOP", // From above
    "ipaddress": "192.168.xxx.xxx",
    "autoRefreshEnabled": true,
    "keepAliveEnabled": true, // If you use local network mode in roomba app, consider disabling. see note below
    "cacheTTL": 30 // in seconds
  }
]
```

#### Refresh mode
This plugins supports these refresh modes:
- NONE (`autoRefreshEnabled` and `keepAlive` both set to false) - no auto refresh, we will connect to roomba and poll status when requested by home app. Please note that this will cause "Updating" status for all homebridge accessories.

- AUTO REFRESH (`autoRefreshEnabled` set to true) - we will connect to roomba, every `pollingInterval` seconds, and store the status in cache. if `pollingInterval` = `cacheTTL` - 10 (or more), this will make sure we will always have a valid status.

- KEEP ALIVE (`keepAlive` set to true) - we will keep a connection to roomba, this will cause app to fail to connect to roomba in local network mode (cloud mode will work just fine, even in your home wifi). This will lead to better performance (status will refresh faster, and toggle will work faster as well). **Keep in mind this will increase the Roomba battery consumption**.
