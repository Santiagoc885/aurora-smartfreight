# Webhooks de Aurora SmartFreight

El servidor envía un evento `dispatch.confirmed` al confirmar un despacho. Los destinos se configuran como variables de entorno del servidor:

- `LOGISTICS_WEBHOOK_URL`
- `FINANCE_WEBHOOK_URL`
- `PLANT_WEBHOOK_URL`

Cada URL debe usar HTTPS. La configuración se mantiene fuera del código y del navegador. La solicitud es `POST` con `Content-Type: application/json` y encabezado `Idempotency-Key` igual al ID del despacho. El cuerpo incluye `event`, `area` y `dispatch` (placa, transportador, cantidades, peso, capacidad, aforo, flete y fecha).

Un código HTTP 2xx marca el aviso como **entregado**; cualquier otro resultado se muestra en el historial. Si no se configura una URL, aparece **sin configurar**. La plataforma guarda el despacho incluso si un destino no responde, para evitar perder el registro operativo.

El historial compartido se actualiza cada tres segundos. Las notificaciones salientes se envían al confirmar el despacho.
