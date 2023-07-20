import { Router } from "express";
import pollRouter from "./poll.routes.js";
import choiceRouter from "./choice.routes.js";


const router = Router();

router.use(pollRouter);
router.use(choiceRouter);

export default router;