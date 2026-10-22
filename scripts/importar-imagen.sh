#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker save laboratorio-node:v1 -o /tmp/laboratorio-node-v1.tar
sudo k3s ctr images import /tmp/laboratorio-node-v1.tar
sudo k3s crictl images | grep laboratorio-node
rm -f /tmp/laboratorio-node-v1.tar
