# Broadcast Box

[![License][license-image]][license-url]
[![Discord][discord-image]][discord-invite-url]

- [What is Broadcast Box](#what-is-broadcast-box)
- [Using](#using)
  - [Broadcasting](#broadcasting)
  - [Broadcasting (GStreamer, CLI)](#broadcasting-gstreamer-cli)
  - [Playback](#playback)
- [Getting Started](#getting-started)
  - [Configuring](#configuring)
  - [Building From Source](#building-from-source)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Docker](#docker)
  - [Docker Compose](#docker-compose)
  - [Environment variables](#environment-variables)
  - [Network Test on Start](#network-test-on-start)
- [Design](#design)

## What is Broadcast Box

Broadcast Box lets you broadcast to others in sub-second time. It was designed
to be simple to use and easily modifiable. We wrote Broadcast Box to show off some
of the cutting edge tech that is coming to the broadcast space.

Want to contribute to the development of Broadcast Box? See [Contributing](./CONTRIBUTING.md).

### Sub-second Latency

Broadcast Box uses WebRTC for broadcast and playback. By using WebRTC instead of
RTMP and HLS you get the fastest experience possible.

### Latest in Video Compression

With WebRTC you get access to the latest in video codecs. With AV1 you can send
the same video quality with a [50%][av1-practical-use-case] reduction in bandwidth required.

[av1-practical-use-case]: https://engineering.fb.com/2018/04/10/video-engineering/av1-beats-x264-and-libvpx-vp9-in-practical-use-case/

### Broadcast all angles

WebRTC allows you to upload multiple video streams in the same session. Now you can
broadcast multiple camera angles, or share interactive video experiences in real time!

### Broadcasters provide transcodes

Transcodes are necessary if you want to provide a good experience to all your users.
Generating them is prohibitively expensive though, WebRTC provides a solution. With WebRTC
users can upload the same video at different quality levels. This
keeps things cheap for the server operator and you still can provide the same
experience.

### Peer-to-Peer (if you need it)

With Broadcast Box you can serve your video without a public IP or forwarding ports!

Run Broadcast Box on the same machine that you are running OBS, and share your
video with the world! WebRTC comes with P2P technology, so users can broadcast
and playback video without paying for dedicated servers. To start the connection users will
need to be able to connect to the HTTP server. After they have negotiated the session then
NAT traversal begins.

You could also use P2P to pull other broadcasters into your stream. No special configuration
or servers required anymore to get sub-second co-streams.

Broadcast Box acts as a [SFU][applied-webrtc-article]. This means that
every client connects to Broadcast Box. No direct connection is established between broadcasters/viewers.
If you want a direct connection between OBS and your browser see [OBS2Browser][obs-2-browser-repo].

[applied-webrtc-article]: https://webrtcforthecurious.com/docs/08-applied-webrtc/#selective-forwarding-unit
[obs-2-browser-repo]: https://github.com/Sean-Der/OBS2Browser

## Using

# Setup
These instructions made it work for me.

- Run `git clone https://github.com/RedMser/broadcast-box.git`
- Apply `.env.production` changes
  - HTTP_ADDRESS is the TCP port to host website (this is done automatically by the go server, so no need to host it yourself)
  - Add UDP_MUX_PORT - it is the UDP port to handle WebRTC stuff properly (not sure if it can be the same as HTTP_ADDRESS)
  - Add INCLUDE_PUBLIC_IP_IN_NAT_1_TO_1_IP=yes
  - Should likely set up SSL as well, since `/publish` won't work without it
- Run `APP_ENV=production go run .` (this needs go set up, I had `go version go1.20.2 windows/amd64`) - this also builds the application if needed

# Usage

- Via OBS: Stream onto `http(s)://<your ip><value of HTTP_ADDRESS>/api/whip`
- Via browser: Open `http(s)://<your ip><value of HTTP_ADDRESS>/publish<stream key>`
- Watch a stream in browser via `http(s)://<your ip><value of HTTP_ADDRESS>/<stream key>`
- Leave out stream key to get an overview page instead

## Neat Features

- When watching a stream, move your mouse to the top left corner to select from other streams
- Stream keys with numbers in them are intentionally hidden, so that's an easy way to have some privacy

# Running
Broadcast Box is made up of two parts. The server is written in Go and is in charge
of ingesting and broadcasting WebRTC. The frontend is plain HTML/JS and connects to the Go
backend.

In production the Go server can be used to serve the HTML/CSS/JS directly.
These are the instructions on how to run all these parts.

### Installing Dependencies
Go dependencies are automatically installed.

### Configuring
Go uses `.env` files for configuration. For development `.env.development` is used
and in production `.env.production` is used.

Setting `APP_ENV` will cause `.env.production` to be loaded.
Otherwise, `.env.development` is used.

### Local Development
To run the Go server with frontend, run `go run .` in the root of this project. You will see the logs
like the following.

```
2022/12/11 15:22:47 Loading `.env.development`
2022/12/11 15:22:47 Running HTTP Server at `:8080`
```

To use Broadcast Box you will open `http://localhost:8080` in your browser. In your broadcast tool of choice
you will broadcast to `http://localhost:8080/api/whip`.

### Production
For production usage Go will serve the frontend and backend.

### Building From Source

#### Frontend

React dependencies are installed by running `npm install` in the `web` directory and `npm run build` will build the frontend.

To use Broadcast Box you will open `http://localhost:8080` in your browser. In your broadcast tool of choice
you will broadcast to `http://localhost:8080/api/whip`.

### Docker (Outdated)

A Docker image is also provided to make it easier to run locally and in production. The arguments you run the Dockerfile with depending on
if you are using it locally or a server.

If you want to run locally execute `docker run -e UDP_MUX_PORT=8080 -e NAT_1_TO_1_IP=127.0.0.1 -p 8080:8080 -p 8080:8080/udp seaduboi/broadcast-box`.
This will make broadcast-box available on `http://localhost:8080`. The UDPMux is needed because Docker on macOS/Windows runs inside a NAT.

If you are running on AWS (or other cloud providers) execute. `docker run --net=host -e INCLUDE_PUBLIC_IP_IN_NAT_1_TO_1_IP=yes seaduboi/broadcast-box`
broadcast-box needs to be run in net=host mode. broadcast-box listens on random UDP ports to establish sessions.

### Docker Compose

A Docker Compose is included that uses LetsEncrypt for automated HTTPS. It also includes Watchtower so your instance of Broadcast Box
will be automatically updated every night. If you are running on a VPS/Cloud server this is the quickest/easiest way to get started.

```console
export URL=my-server.com
docker-compose up -d
```

## Environment Variables

The backend can be configured with the following environment variables.

- `DISABLE_STATUS` - Disable the status API
- `ENABLE_HTTP_REDIRECT` - HTTP traffic will be redirect to HTTPS
- `HTTP_ADDRESS` - HTTP Server Address
- `INCLUDE_PUBLIC_IP_IN_NAT_1_TO_1_IP` - Like `NAT_1_TO_1_IP` but autoconfigured
- `INTERFACE_FILTER` - Only use a certain interface for UDP traffic
- `NAT_1_TO_1_IP` - If behind a NAT use this to auto insert your public IP
- `NETWORK_TEST_ON_START` - When "true" on startup Broadcast Box will check network connectivity
- `SSL_CERT` - Path to SSL certificate if using Broadcast Box's HTTP Server
- `SSL_KEY` - Path to SSL key if using Broadcast Box's HTTP Server

- `STUN_SERVERS` - List of STUN servers delineated by '|'. Useful if Broadcast Box is running behind a NAT

- `UDP_MUX_PORT_WHEP` - Like `UDP_MUX_PORT` but only for WHEP traffic
- `UDP_MUX_PORT_WHIP` - Like `UDP_MUX_PORT` but only for WHIP traffic
- `UDP_MUX_PORT` - Serve all UDP traffic via one port. By default Broadcast Box listens on a random port

- `TCP_MUX_ADDRESS` - If you wish to make WebRTC traffic available via TCP.
- `TCP_MUX_FORCE` - If you wish to make WebRTC traffic only available via TCP.

## Network Test on Start

When running in Docker Broadcast Box runs a network tests on startup. This tests that WebRTC traffic can be established
against your server. If you server is misconfigured Broadcast Box will not start.

If the network test is enabled this will be printed on startup

```console
NETWORK_TEST_ON_START is enabled. If the test fails Broadcast Box will exit.
See the README.md for how to debug or disable NETWORK_TEST_ON_START
```

If the test passed you will see

```console
Network Test passed.
Have fun using Broadcast Box
```

If the test failed you will see the following. The middle sentence will change depending on the error.

```console
Network Test failed.
Network Test client reported nothing in 30 seconds
Please see the README and join Discord for help
```

[Join the Discord][discord-invite-url] and we are ready to help! To debug check the following.

- Have you allowed UDP traffic?
- Do you have any restrictions on ports?
- Is your server publicly accessible?

If you wish to disable the test set the environment variable `NETWORK_TEST_ON_START` to false.

## Design

The backend exposes three endpoints (the status page is optional, if hosting locally).

- `/api/whip` - Start a WHIP Session. WHIP broadcasts video via WebRTC.
- `/api/whep` - Start a WHEP Session. WHEP is video playback via WebRTC.
- `/api/status` - Status of the all active WHIP streams

[license-image]: https://img.shields.io/badge/License-MIT-yellow.svg
[license-url]: https://opensource.org/licenses/MIT
[discord-image]: https://img.shields.io/discord/1162823780708651018?logo=discord
[discord-invite-url]: https://discord.gg/An5jjhNUE3
