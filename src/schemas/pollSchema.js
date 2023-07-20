import Joi from "joi";

const pollSchema = Joi.object({
    title: Joi.string().required()
});

export default pollSchema;
