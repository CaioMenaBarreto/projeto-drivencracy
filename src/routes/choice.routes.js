import { Router } from "express";
import schemaValidation from "../middlewares/schemaValidation.js";
import choiceSchema from "../schemas/choiceSchema.js";
import { choicePost } from "../controllers/choices.controllers.js";
import { postChoiceIdVote } from "../controllers/choices.controllers.js";

const choiceRouter = Router();

choiceRouter.post("/choice", schemaValidation(choiceSchema), choicePost);
choiceRouter.post("/choice/:id/vote", postChoiceIdVote);

export default choiceRouter;