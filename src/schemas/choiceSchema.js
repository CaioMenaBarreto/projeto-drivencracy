import Joi from "joi";

const choiceSchema = Joi.object({
    title: Joi.string().required(),
    pollId: Joi.string().required()
});

export default choiceSchema;