echo "Removing ingress rules..."
kubectl delete -f load-balancer/
echo "Removing services..."
kubectl delete -f pods/
echo "Removing ingress controller..."
kubectl delete -f controllers/
echo "Removing namespace..."
kubectl delete -f space-namespace.yml