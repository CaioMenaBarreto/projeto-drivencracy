import { db } from "../database/db.connection.js";
import dayjs from "dayjs";
import { ObjectId } from "mongodb";
import pollSchema from "../schemas/pollSchema.js";

export async function postPoll(req, res) {
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
    };
};

export async function getPoll(req, res) {
    try {
        const enquetes = await db.collection("Enquetes").find().toArray();
        return res.status(200).send(enquetes);

    } catch (error) {
        console.error("Erro no servidor:", error.message);
        return res.status(500).json({ error: "Erro no servidor. Por favor, tente novamente mais tarde." });
    };
};

export async function getPollIdChoice(req, res) {
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
        };
};

export async function getPollIdResult(req, res) {
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
                const choiceId = choice._id;
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
        };
};