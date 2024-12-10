import { httpRouter } from "convex/server";
import { createUser } from "./tasks";


const http = httpRouter();

http.route({
  path: "/createUser",
  method: "POST",
  handler: createUser,
});

export default http;


