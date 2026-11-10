// Salud del contenedor: responde con el contenedor arriba, sin depender de la API.
export function GET() {
  return Response.json({ status: 'ok' });
}
