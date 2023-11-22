FROM golang:1.19-alpine AS go-build
WORKDIR /broadcast-box
ENV GOPROXY=direct
ENV GOSUMDB=off
COPY . /broadcast-box
RUN apk add git
RUN go build

FROM golang:1.19-alpine
COPY --from=go-build /broadcast-box/broadcast-box /broadcast-box/broadcast-box
COPY --from=go-build /broadcast-box/.env.production /broadcast-box/.env.production
WORKDIR /broadcast-box
ENV APP_ENV=production
ENTRYPOINT ["/broadcast-box/broadcast-box"]
