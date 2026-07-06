// @ts-ignore
import app from '../dist/server.cjs';

export default function handler(req: any, res: any) {
  return (app.default || app)(req, res);
}
