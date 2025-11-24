#!/bin/sh
set -e

RTSP_URL="rtsp://mediamtx:8554/mystream"
echo "[info] publishing H264+AAC to $RTSP_URL (HLS mpegts 호환)"

ffmpeg \
  -re -loop 1 -framerate 30 -i dido_sunny.jpg \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -filter_complex "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30,format=yuv420p" \
  -c:v libx264 -profile:v baseline -bf 0 -tune stillimage -preset veryfast \
  -r 30 -g 60 -keyint_min 60 -sc_threshold 0 -vsync cfr \
  -c:a aac -ar 48000 -b:a 128k -ac 2 \
  -f rtsp -rtsp_transport tcp "$RTSP_URL"