# Laboratorio Kubernetes K3s

## Objetivo
Comparar Compose con Kubernetes y demostrar reconciliación, autorrecuperación, RBAC y rechazo de Pods privilegiados en una VM Ubuntu con Vagrant.

## Requisitos
- Ubuntu Server en Vagrant, 2 vCPU y 3 GB RAM recomendados (sujeto a disponibilidad del host).
- K3s instalado y `sudo k3s kubectl get nodes` mostrando `Ready`.
- Docker Engine y plugin Docker Compose. No es necesario configurar Docker como runtime de K3s.
- Acceso a Internet para obtener dependencias e imagen base durante la construcción.


## 1. Ejecutar la aplicación con Compose
Desde la carpeta del proyecto:
```bash
sudo docker compose up -d --build
curl http://localhost:3000/
sudo docker compose ps
sudo docker compose down
```
La API devuelve JSON con `mensaje`, `version`, `pod` y `fecha`. `pod` será el hostname del contenedor.

## 2. Importar imagen a K3s
Docker y containerd de K3s mantienen almacenes de imágenes separados. **Detén Compose antes de iniciar Pods**.
```bash
sudo bash scripts/importar-imagen.sh
```
Se usa `imagePullPolicy: Never`, así que K3s exige que la imagen esté importada localmente.

## 3. Desplegar Kubernetes
```bash
sudo k3s kubectl apply -f k8s/01-namespace.yaml
sudo k3s kubectl apply -f k8s/02-deployment.yaml
sudo k3s kubectl apply -f k8s/03-service.yaml
sudo k3s kubectl get deploy,rs,pods,svc -n laboratorio -o wide
curl http://localhost:30080/
```
Desde Windows, si la VM tiene la IP privada `192.168.56.20`, visita `http://192.168.56.20:30080/` (verifica que el firewall lo permita).

### Modelo mental
- Compose `service api` -> Deployment `node-api` y Pods.
- `replicas: 2` -> el ReplicaSet procura mantener dos Pods.
- Service NodePort -> punto de acceso estable a Pods seleccionados por etiqueta.
- `containerd` ejecuta la imagen importada; Docker Engine no ejecuta estos Pods.

## 4. Visualizar la autorrecuperación
```bash
sudo k3s kubectl get pods -n laboratorio
sudo k3s kubectl delete pod NOMBRE_DEL_POD -n laboratorio
sudo k3s kubectl get pods -n laboratorio -w
```
Presiona Ctrl+C para salir de `-w`. Explica que el controlador de ReplicaSet crea un Pod nuevo para mantener el estado deseado. **No demuestra tolerancia a caída del único nodo**.

## 5. Control de Acceso basado en Roles (RBAC)
```bash
sudo k3s kubectl apply -f k8s/04-rbac.yaml
sudo k3s kubectl auth can-i list pods -n laboratorio --as=system:serviceaccount:laboratorio:auditor
sudo k3s kubectl auth can-i delete pods -n laboratorio --as=system:serviceaccount:laboratorio:auditor
```
Resultados esperados: `yes` y `no`. La identidad `auditor` puede consultar Pods, pero no eliminarlos. No equivale a la autorización HTTP de la aplicación Node.js.

## 6. Demostrar Pod Security Admission (opcional)
```bash
sudo k3s kubectl create namespace seguro
sudo k3s kubectl label namespace seguro pod-security.kubernetes.io/enforce=restricted
sudo k3s kubectl apply -f k8s/05-pod-inseguro.yaml
```
Se espera rechazo `Forbidden` por `privileged: true`. El manifiesto se utiliza para demostrar una configuración insegura, **no para ejecutarla**.

## 7. Diagnóstico
```bash
free -h
sudo k3s kubectl describe pods -n laboratorio
sudo k3s kubectl get events -n laboratorio --sort-by=.lastTimestamp
sudo k3s crictl images
sudo docker images
```
Si aparece `ErrImageNeverPull`, confirma la importación y el nombre `laboratorio-node:v1`. Si aparece `OOMKilled`, reduce `replicas` a 1 o libera memoria.

## 8. Limpieza
```bash
sudo k3s kubectl delete namespace laboratorio seguro --ignore-not-found
sudo docker compose down
```