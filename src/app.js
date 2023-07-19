import express from "express";
import Joi from "joi";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import { ObjectId } from "mongodb";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
    await mongoClient.connect();
    console.log("MongoDB conectado!");
} catch (erro) {
    console.log(erro.message);
}
const db = mongoClient.db();

const pollSchema = Joi.object({
    title: Joi.string().required()
});

app.post("/poll", async (req, res) => {
    const { title, expireAt } = req.body;
    try {
        const validation = pollSchema.validate({ title }, { abortEarly: false });

        if (validation.error) {
            const errors = validation.error.details.map(detail => detail.message);
            return res.status(422).send(errors);
        };

        let expireAtValue = expireAt;

        if (!expireAtValue || expireAtValue === "") {
            expireAtValue = dayjs().add(30, "day").format("YYYY-MM-DD HH:mm")
        };

        const enquete = { title, expireAt: expireAtValue };

        await db.collection("Enquetes").insertOne(enquete);

        return res.status(201).send(enquete);

    } catch (error) {
        console.error("Erro no servidor:", error.message);
        return res.status(500).json({ error: "Erro no servidor. Por favor, tente novamente mais tarde." });
    }
});

app.get("/poll", async (req, res) => {
    try {
        const enquetes = await db.collection("Enquetes").find().toArray();
        console.log(enquetes);
        return res.status(200).send(enquetes);

    } catch (error) {
        console.error("Erro no servidor:", error.message);
        return res.status(500).json({ error: "Erro no servidor. Por favor, tente novamente mais tarde." });
    }
});

const choiceSchema = Joi.object({
    title: Joi.string().required(),
    pollId: Joi.string().required()
});

app.post("/choice", async (req, res) => {
    const { title, pollId } = req.body;
    try {
        const validation = choiceSchema.validate({ title, pollId }, { abortEarly: false });

        if (validation.error) {
            const errors = validation.error.details.map(detail => detail.message);
            return res.status(422).send(errors);
        };

        const pollObjectId = new ObjectId(pollId);

        const enqueteExistente = await db.collection("Enquetes").findOne({ _id: pollObjectId });
        if (!enqueteExistente) {
            return res.status(404).send("Enquete inexistente.");
        };

        const titleExistente = await db.collection("Escolhas").findOne({ title });
        if (titleExistente) {
            return res.status(409).send("O título já está sendo utilizado.");
        }

        const voto = {title, pollId};
        await db.collection("Escolhas").insertOne(voto);

        console.log(voto);
        res.status(201).send(voto);

    } catch (error) {
        console.error("Erro no servidor:", error.message);
        return res.status(500).json({ error: "Erro no servidor. Por favor, tente novamente mais tarde." });
    }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`O servidor está rodando na porta ${PORT}`));