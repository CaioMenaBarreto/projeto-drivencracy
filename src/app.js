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

        const expirou = dayjs().isAfter(enqueteExistente.expireAt, "minute");
        if (expirou) {
            return res.status(403).send("A enquete já expirou.");
        }

        const choice = { title, pollId };
        await db.collection("Escolhas").insertOne(choice);

        res.status(201).send(choice);

    } catch (error) {
        console.error("Erro no servidor:", error.message);
        return res.status(500).json({ error: "Erro no servidor. Por favor, tente novamente mais tarde." });
    }
});

app.get("/poll/:id/choice", async (req, res) => {
    const id = req.params.id;

    try {
        const pollObjectId = new ObjectId(id);
        const enqueteExistente = await db.collection("Enquetes").findOne({ _id: pollObjectId });

        if (!enqueteExistente) {
            return res.status(404).send("Enquete inexistente.");
        }

        const choices = await db.collection("Escolhas").find({ pollId: id }).toArray();

        return res.status(200).json(choices);

    } catch (error) {
        console.error("Erro no servidor:", error.message);
        return res.status(500).json({ error: "Erro no servidor. Por favor, tente novamente mais tarde." });
    }

});

app.post("/choice/:id/vote", async (req, res) => {
    const id = req.params.id;

    try {
        const choiceObjectId = new ObjectId(id);
        const escolhaExistente = await db.collection("Escolhas").findOne({ _id: choiceObjectId });

        if (!escolhaExistente) {
            return res.status(404).send("Escolha inexistente.");
        };

        const pollObjectId = new ObjectId(escolhaExistente.pollId)
        const enqueteExistente = await db.collection("Enquetes").findOne(pollObjectId);

        const expirou = dayjs().isAfter(enqueteExistente.expireAt, "minute");
        if (expirou) {
            return res.status(403).send("A enquete já expirou.");
        }

        const voto = {
            createdAt: dayjs().format("YYYY-MM-DD HH:mm"),
            choiceId: new ObjectId(id)
        }

        await db.collection("Votos").insertOne(voto);

        return res.sendStatus(201);

    } catch (error) {
        console.error("Erro no servidor:", error.message);
        return res.status(500).json({ error: "Erro no servidor. Por favor, tente novamente mais tarde." });
    }
});

app.get("/poll/:id/result", async (req, res) => {
    const id = req.params.id;

    try {
        const pollObjectId = new ObjectId(id);
        const enqueteExistente = await db.collection("Enquetes").findOne({ _id: pollObjectId });
        if (!enqueteExistente) {
            return res.status(404).send("Enquete inexistente.");
        }

        const choices = await db.collection("Escolhas").find({ pollId: id }).toArray();

        let opcaoMaisVotada = null;
        let numeroVotosMaisVotada = 0;

        for (const choice of choices) {
            const choiceId = choice._id.toString();
            const numeroVotos = await db.collection("Votos").countDocuments({ choiceId });

            if (numeroVotos > numeroVotosMaisVotada) {
                opcaoMaisVotada = choice;
                numeroVotosMaisVotada = numeroVotos;
            }
        }

        if (!opcaoMaisVotada) {
            return res.status(200).json({
                _id: enqueteExistente._id,
                title: enqueteExistente.title,
                expireAt: enqueteExistente.expireAt,
                result: "Nenhuma opção de voto com votos encontrada."
            });
        }

        const resultado = {
            _id: enqueteExistente._id,
            title: enqueteExistente.title,
            expireAt: enqueteExistente.expireAt,
            result: {
                title: opcaoMaisVotada.title,
                votes: numeroVotosMaisVotada
            }
        };

        return res.status(200).json(resultado);

    } catch (error) {
        console.error("Erro no servidor:", error.message);
        return res.status(500).json({ error: "Erro no servidor. Por favor, tente novamente mais tarde." });
    }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`O servidor está rodando na porta ${PORT}`));