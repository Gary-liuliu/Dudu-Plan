# 嘟嘟计划

个人使用的安卓增肌训练应用，使用 Expo + React Native + TypeScript 开发。训练、饮水、蛋白质和身体数据仅保存在当前设备，不需要账号。

## 本地运行

```powershell
npm.cmd install
npm.cmd run start:lan
```

安卓手机与电脑连接同一局域网，在 Expo Go 中扫描终端二维码或输入终端显示的 `exp://` 地址。

## 检查

```powershell
npm.cmd run check
npx.cmd expo-doctor
npx.cmd expo export --platform web --output-dir dist
```

## 构建 APK

这台开发机没有 Android SDK，可使用 EAS 云构建预览 APK：

```powershell
npx.cmd eas-cli@latest login
npm.cmd run build:cloud:apk
```

云构建会要求 Expo 账号，并把项目源代码上传到 Expo 构建服务。`preview` 配置输出可直接安装的 APK；`production` 配置输出用于应用商店的 AAB。

## 通知说明

训练日会在 19:20 和 19:30 生成本地系统通知。Android 13 及以上需要允许通知；部分国产系统的省电、后台限制或强制停止可能延迟通知。重新打开应用会重排提醒。

卸载应用或清除应用数据会永久删除本机记录。
