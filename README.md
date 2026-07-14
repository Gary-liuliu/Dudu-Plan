# 嘟嘟计划

面向两台安卓手机的居家增肌训练应用，使用 Expo、React Native 和 TypeScript 开发。

- `嘟嘟`账号：完整训练、饮食、饮水和本地记录界面。
- `肚肚`账号：只读查看嘟嘟的实时训练、完成日历和已同步历史。
- 训练数据保存在手机本地；Cloudflare Worker 仅转发在线 WebSocket 消息，不建立训练数据库。
- 肚肚手机会缓存已经收到的训练记录。卸载应用或清除数据会删除对应手机的本地记录。

账号密码不得写入源码、Expo 配置或 Git。Cloudflare 只保存 PBKDF2 凭据散列和签名密钥 Secret。

## 安装与检查

```powershell
cd D:\tt\dudu-plan
npm.cmd install
npm.cmd --prefix relay install
npm.cmd run check
npm.cmd run relay:check
npx.cmd expo-doctor
```

启动 Expo 开发服务：

```powershell
npm.cmd run start:lan
```

## Cloudflare 中继

中继代码位于 `relay/`，包含登录、Durable Object WebSocket 房间和 Expo Push 转发。Worker 不调用 Durable Object 存储 API，不保存训练、密码、推送令牌或消息历史。

### 1. 生成账号凭据

凭据生成器会交互式读取两个账号的密码，并输出 PBKDF2 散列 JSON；密码输入不会显示：

```powershell
npm.cmd --prefix relay run credentials
```

不要把生成时输入的明文密码或最终 Secret 写入 README、`.env`、截图或提交记录。

### 2. 本地中继

在 `relay/.dev.vars` 中配置本地 Secret，该文件已被 Git 忽略：

```dotenv
AUTH_CREDENTIALS={"version":1,"algorithm":"PBKDF2-SHA-256","iterations":210000,"accounts":{...}}
TOKEN_SECRET=至少32个随机字符
```

启动本地 Worker：

```powershell
npm.cmd run relay:dev
```

### 3. 部署到 Cloudflare

```powershell
cd D:\tt\dudu-plan\relay
npx.cmd wrangler login
npm.cmd run secrets
cd ..
npm.cmd run relay:deploy
```

`npm.cmd run secrets` 会隐藏读取并确认两组账号密码，然后把 PBKDF2 散列和随机签名密钥直接写入 Cloudflare；中间值不会打印或保存到文件。部署成功后，Wrangler 会输出形如 `https://dudu-plan-relay.<账户>.workers.dev` 的地址。

移动端只需要公开的中继地址。在本地创建 `.env.local`：

```dotenv
EXPO_PUBLIC_RELAY_URL=https://dudu-plan-relay.<账户>.workers.dev
```

`EXPO_PUBLIC_` 变量会被打包进 APK，只能放公开地址，禁止放密码、令牌或 Firebase 私钥。

EAS 云构建前，将同一地址加入 `preview` 环境：

```powershell
npx.cmd eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_RELAY_URL --value https://dudu-plan-relay.<账户>.workers.dev --visibility plaintext
```

生产构建时对 `production` 环境重复配置。修改中继地址后必须重新构建 APK。

## Firebase 与系统通知

Firebase 只用于 Android FCM 推送，不保存训练数据。嘟嘟开始或完成训练时，Worker 通过 Expo Push Service 向肚肚手机发送系统通知。

1. 在 Firebase 创建 Android 应用，包名必须是 `com.duduplan.app`。
2. 下载 `google-services.json`。当前仓库忽略该文件，先把它作为 EAS Secret 文件变量上传：

```powershell
npx.cmd eas-cli@latest env:create --environment preview --name GOOGLE_SERVICES_JSON --value .\google-services.json --type file --visibility secret
```

3. 项目的 `app.config.js` 会把 `GOOGLE_SERVICES_JSON` 自动映射到 `android.googleServicesFile`。需要生产 AAB 时，对 `production` 环境重复上传该文件变量。
4. 在 Firebase 创建仅用于 FCM HTTP v1 的服务账号 JSON。该文件含私钥，必须保留在 Git 之外。
5. 运行 `npx.cmd eas-cli@latest credentials --platform android`，依次选择 `production`、Google Service Account 和 Push Notifications，并上传服务账号 JSON。
6. 若在 Expo 项目中启用了 Push Security，再把 Expo Access Token 配置到 Worker：

```powershell
cd D:\tt\dudu-plan\relay
npx.cmd wrangler secret put EXPO_ACCESS_TOKEN
```

远程推送需要真实安卓设备和 EAS 构建；Expo Go 不用于验证该流程。肚肚手机首次允许通知后，会在两台手机同时在线时把 Expo Push Token 交给嘟嘟手机，Worker 不保存该 Token。

## 构建 APK

先完成 Cloudflare 地址和需要的 FCM 凭据配置，再执行：

```powershell
cd D:\tt\dudu-plan
npx.cmd eas-cli@latest login
npm.cmd run check
npm.cmd run relay:check
npm.cmd run build:cloud:apk
```

`preview` 配置生成可直接安装的 APK。构建完成后使用 EAS 输出的云端安装链接，无需把 APK 下载到项目目录。

## 同步边界

- 嘟嘟离线时仍可完整训练和记录，恢复连接后发送符合条件的训练快照。
- 仅同步嘟嘟首次登录 1.1 版本之后创建的训练；升级时正在进行的训练也会同步。
- 肚肚离线时显示最后一次本地缓存及同步时间，不会修改嘟嘟数据。
- 同一角色再次登录会替换该角色之前的 WebSocket 连接。
- 肚肚重装应用或推送 Token 改变后，两台手机需要同时打开一次以重新绑定通知。
- 肚肚退出账号时会注销该手机的远程推送注册；再次登录后会生成并重新绑定 Token。
