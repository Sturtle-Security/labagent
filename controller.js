const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromFile(__dirname + '/kubeconfig.yaml');

const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);

const suppressError = async (fn) => {
    try {
        await fn();
    } catch (e) {
        // Error suppressed
    }
};

const deleteLab = async (labName) => {
    await suppressError(() => k8sAppsApi.deleteNamespacedReplicaSet(`${labName}-rs`, 'default'));
    await suppressError(() => k8sNetworkingApi.deleteNamespacedIngress(`${labName}-ingress`, 'default'));
    await suppressError(() => k8sCoreApi.deleteNamespacedService(`${labName}-service`, 'default'));
}

const createLab = async (payload) => {
    // check that no duplicate container port is present
    const containerPorts = new Set();
    for (const app of payload.apps) {
        for (const port of app.ports) {
            if (containerPorts.has(port)) {
                throw new Error('Duplicate container port found in payload');
            }
            containerPorts.add(port);
        }
    }
    await deleteLab(payload);
    const labName = payload.name;
    // create replica set
    await k8sAppsApi.createNamespacedReplicaSet('default', {
        kind: 'ReplicaSet',
        metadata: {
            name: `${labName}-rs`
        },
        spec: {
            replicas: 1,
            selector: {
                matchLabels: {
                    app: `${labName}-pod`
                }
            },
            template: {
                metadata: {
                    labels: {
                        app: `${labName}-pod`
                    }
                },
                spec: {
                    containers: payload.apps.map((app) => {
                        return {
                            name: app.name,
                            image: app.image,
                            ports: app.ports.map(port => {
                                return {
                                    containerPort: port
                                }
                            })
                        }
                    })
                }
            }
        }
    })
    // create service
    await k8sCoreApi.createNamespacedService('default', {
        kind: 'Service',
        metadata: {
            name: `${labName}-service`
        },
        spec: {
            type: 'LoadBalancer',
            selector: {
                app: `${labName}-pod`
            },
            ports: Array.from(containerPorts).map((port) => {
                return {
                    port: port,
                    targetPort: port,
                    protocol: 'TCP'
                }
            })
        }
    })
    // create ingress
    await k8sNetworkingApi.createNamespacedIngress('default', {
        kind: 'Ingress',
        metadata: {
            name: `${labName}-ingress`
        },
        spec: {
            rules: payload.ingresses.map((ingress) => {
                return {
                    host: ingress.host,
                    http: {
                        paths: [
                            {
                                pathType: 'Prefix',
                                path: '/',
                                backend: {
                                    service: {
                                        name: `${labName}-service`,
                                        port: {
                                            number: ingress.port
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            })
        }
    })
}

const isRunning = async (labName) => {
    try {
        const status = (await k8sAppsApi.readNamespacedReplicaSet(`${labName}-rs`, 'default')).body.status
        return status.replicas === status.readyReplicas;
    } catch (error) {
        return false;
    }
}

module.exports = {
    createLab,
    deleteLab,
    isRunning
}