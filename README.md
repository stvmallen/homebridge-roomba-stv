# homebridge-roomba-stv
homebridge-plugin for Roomba 9xx (Roomba 900 Software Version 2.x).

## Features:
- Roomba start on demand
- Roomba stop and dock on demand
- Roomba charging status
- Roomba battery level

## Credits to:

https://github.com/umesan/homebridge-roomba

https://github.com/steedferns/homebridge-roomba980

https://github.com/gbro115/homebridge-roomba690

# Installation:

## 1. Install homebridge and Roomba plugin.
- 1.1 `npm install -g homebridge`
- 1.2 `npm install -g homebridge-roomba`

## 2. Find robotpwd and blid.
- 2.1 Run `npm run getrobotpwd 192.16.xx.xx` where this plugin in installed
- 2.2 Follow instructions

If successful, the following message will be displayed.

Please check **blid** and **Password** of displayed message.

```
Robot Data:
{ ver: '2',
  hostname: 'Roomba-xxxxxxxxxxxxxxxx',
  robotname: 'Your Roomba’s Name',
  ip: '192.168.xx.xx',
  mac: 'xx:xx:xx:xx:xx:xx',
  sw: 'vx.x.x-x',
  sku: 'R98----',
  nc: 0,
  proto: 'mqtt',
  blid: '0123456789abcdef' }
Password=> :1:2345678910:ABCDEFGHIJKLMNOP <= Yes, all this string.
```

## 4. Update homebridge configuration file.
```
"accessories": [
  {
    "accessory": "Roomba",
    "name": "Roomba",
    "model": "960",
    "blid": "0123456789abcdef",
    "robotpwd": ":1:2345678910:ABCDEFGHIJKLMNOP",
    "ipaddress": "192.168.xx.xx"
  }
]
```
