import dayjs from "dayjs";
import { ObjectId } from "mongodb";
import choiceSchema from "../schemas/choiceSchema.js";
import { db } from "../database/db.connection.js";


export async function choicePost(req, res) {
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
    };
};

export async function postChoiceIdVote(req, res) {
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
    };
};