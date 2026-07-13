export function decodeJwtPayload(token: string): any | null {
    
  try {

    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));

    const decoded = decodeURIComponent(
      Array.prototype.map.call(json, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}