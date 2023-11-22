# Broadcast Box
Broadcast Box lets you broadcast to others in sub-second time. It was designed
to be simple to use and easily modifiable. We wrote Broadcast Box to show off some
of the cutting edge tech that is coming to the broadcast space.

### Subsecond Latency
Broadcast Box uses WebRTC for broadcast and playback. By using WebRTC instead of
RTMP and HLS you get the fastest experience possible.

### Latest in Video Compression
With WebRTC you get access to the latest in video codecs. With AV1 you can send
the same video quality with a [50%](https://engineering.fb.com/2018/04/10/video-engineering/av1-beats-x264-and-libvpx-vp9-in-practical-use-case/)
reduction in bandwidth required.

### Broadcast all angles
WebRTC allows you to upload multiple video streams in the same session. Now you can
broadcast multiple camera angles, or share interactive video experiences in real time!

### Broadcasters provide transcodes
Transcodes are necessary if you want to provide a good experience to all your users.
Generating them is prohibitively though. WebRTC provides a solution. With WebRTC
users can upload the same video at different quality levels. This
keeps things cheap for the server operator, and you still can provide the same
experience.

### Peer-to-Peer (if you need it)
With Broadcast Box you can serve your video without a public IP or forwarding ports!
Run Broadcast Box on the same machine that you are running OBS, and share your
video with the world! WebRTC comes with P2P technology, so users can broadcast
and playback video without paying for dedicated servers.

You could also use P2P to pull other broadcasters into your stream. No special configuration
or servers required anymore to get sub-second costreams.

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

To run the Go server run `APP_ENV=production go run .` in the root of this project. You will see the logs
like the following.

```
2022/12/11 16:02:14 Loading `.env.production`
2022/12/11 16:02:14 Running HTTP Server at `:8080`
```

If `APP_ENV` was set properly `.env.production` will be loaded.

To use Broadcast Box you will open `http://localhost:8080` in your browser. In your broadcast tool of choice
you will broadcast to `http://localhost:8080/api/whip`.

### Docker (Outdated)
A Docker image is also provided to make it easier to run locally and in production. The arguments you run the Dockerfile with depending on
if you are using it locally or a server.

If you want to run locally execute `docker run -e UDP_MUX_PORT=8080 -e NAT_1_TO_1_IP=127.0.0.1 -p 8080:8080 -p 8080:8080/udp seaduboi/broadcast-box`.
This will make broadcast-box available on `http://localhost:8080`. The UDPMux is needed because Docker on macOS/Windows runs inside a NAT.

If you are running on AWS (or other cloud providers) execute. `docker run --net=host -e INCLUDE_PUBLIC_IP_IN_NAT_1_TO_1_IP=yes seaduboi/broadcast-box`
broadcast-box needs to be run in net=host mode. broadcast-box listens on random UDP ports to establish sessions.

You can also run it in docker-compose with the following
```
broadcast-box:
  environment:
  - INCLUDE_PUBLIC_IP_IN_NAT_1_TO_1_IP=yes
  image: broadcast-box
  hostname: broadcast-box
  container_name: broadcast-box
  network_mode: "host"
  privileged: true
```

The command to upload the image to Dockerhub is `docker buildx build --platform=linux/amd64,linux/arm64 --push -t seaduboi/broadcast-box:latest .`

# Design
The backend exposes following endpoints:

* `/api/whip` - Start a WHIP Session. WHIP broadcasts video via WebRTC.
* `/api/whep` - Start a WHEP Session. WHEP is video playback via WebRTC.
* `/api/status` - JSON array of current connections.
* `/api/sse` - Internal API.
* `/api/layer` - Internal API.
