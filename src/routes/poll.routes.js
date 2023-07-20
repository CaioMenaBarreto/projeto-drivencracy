import { Router } from "express";
import pollSchema from "../schemas/pollSchema.js";
import schemaValidation from "../middlewares/schemaValidation.js";
import { postPoll } from "../controllers/polls.controllers.js";
import { getPoll } from "../controllers/polls.controllers.js";
import { getPollIdChoice } from "../controllers/polls.controllers.js";
import { getPollIdResult } from "../controllers/polls.controllers.js";

const pollRouter = Router();

pollRouter.post("/poll", schemaValidation(pollSchema), postPoll);
pollRouter.get("/poll", getPoll);
pollRouter.get("/poll/:id/choice", getPollIdChoice);
pollRouter.get("/poll/:id/result", getPollIdResult);

export default pollRouter;
