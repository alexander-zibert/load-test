import http from "http";
import url from "url";

const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;
  await new Promise((res) => setTimeout(res, 1000 * Number(query.timeout)));
  res.writeHead(200);
  res.end(JSON.stringify(query));
});
server.listen(80, () => console.log("Server started on port 80..."));
