"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.getHealth = void 0;
const user_grpc_1 = require("../grpc/user.grpc");
const common_1 = require("@phoenix/common");
const getHealth = (req, res) => {
    user_grpc_1.userGrpcClient.GetUserHealth({}, (error, response) => {
        if (error) {
            common_1.logger.error(`Error calling GetUserHealth: ${error}`);
            res
                .status(response.status || common_1.HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json({ message: "Error fetching user health" });
        }
        return res
            .status(response.status || common_1.HttpStatusCode.HTTP_STATUS_OK)
            .json({ message: response?.message });
    });
};
exports.getHealth = getHealth;
const getUser = (req, res) => {
    user_grpc_1.userGrpcClient.GetUsers({}, (error, response) => {
        if (error) {
            common_1.logger.error(`Error calling GetUsers: ${error}`);
            res
                .status(response.status || common_1.HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json({ message: "Error fetching users" });
        }
        return res.status(response.status || common_1.HttpStatusCode.HTTP_STATUS_OK).json({
            message: response?.message,
            user: response?.users,
        });
    });
};
exports.getUser = getUser;
