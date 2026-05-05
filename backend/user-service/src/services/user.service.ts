import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { HttpStatusCode, logger, UserAccount } from "@phoenix/common";
import {
  GetHealthDto,
  GetUsersDto,
  RegisterUserDto,
  LoginUserDto,
  RefreshTokenDto,
  LogoutUserDto,
} from "../dto/user.dto";
import { GetHealthEntity, GetUsersEntity, AuthEntity } from "../entity/user.entity";

const JWT_SECRET = process.env.JWT_SECRET || "secret123";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export const getHealth = (getHealthDto: GetHealthDto): GetHealthEntity => {
  return {
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "User service is runninng",
  };
};

export const getUsers = async (
  getUserDto: GetUsersDto,
): Promise<GetUsersEntity> => {
  try {
    logger.info("Fetching users from database...");
    const users = await UserAccount.findAll({});
    logger.info(`Fetched ${users.length} users from database.`);

    const returnUser = GetUsersEntity.toEntity({ users });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Users fetched successfully",
      users: returnUser.users,
    };
  } catch (error) {
    logger.error(`Error fetching users: ${error}`);
    throw new Error("Error fetching users");
  }
};

export const registerUser = async (
  dto: RegisterUserDto,
): Promise<AuthEntity> => {
  try {
    if (!dto.username || !dto.password) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Username and password are required",
      };
    }

    const existingUser = await UserAccount.findOne({
      where: { username: dto.username },
    });

    if (existingUser) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Username already exists",
      };
    }

    const password_hashed = await bcrypt.hash(dto.password, 10);

    const newUser = await UserAccount.create({
      username: dto.username,
      password_hashed,
      role: dto.role || "user",
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_CREATED,
      message: "User registered successfully",
      user_id: newUser.user_id,
      username: newUser.username,
      role: newUser.role,
    };
  } catch (error) {
    logger.error(`Register error: ${error}`);
    throw new Error("Register failed");
  }
};

export const loginUser = async (dto: LoginUserDto): Promise<AuthEntity> => {
  try {
    if (!dto.username || !dto.password) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Username and password are required",
      };
    }

    const user = await UserAccount.findOne({
      where: { username: dto.username },
    });

    if (!user) {
      return {
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Invalid username or password",
      };
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hashed,
    );

    if (!isPasswordValid) {
      return {
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Invalid username or password",
      };
    }

    const tokenPayload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
    };

    const access_token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refresh_token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    await user.update({
      access_token,
      refresh_token,
    });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Login successful",
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      access_token,
      refresh_token,
    };
  } catch (error) {
    logger.error(`Login error: ${error}`);
    throw new Error("Login failed");
  }
};

export const refreshToken = async (
  dto: RefreshTokenDto,
): Promise<AuthEntity> => {
  try {
    if (!dto.refresh_token) {
      return {
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Refresh token is required",
      };
    }

    const decoded = jwt.verify(dto.refresh_token, JWT_SECRET) as {
      user_id: string;
      username: string;
      role: string;
    };

    const user = await UserAccount.findByPk(decoded.user_id);

    if (!user || user.refresh_token !== dto.refresh_token) {
      return {
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Invalid refresh token",
      };
    }

    const access_token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    await user.update({ access_token });

    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Token refreshed successfully",
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      access_token,
      refresh_token: dto.refresh_token,
    };
  } catch (error) {
    logger.error(`Refresh token error: ${error}`);
    return {
      status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
      message: "Invalid or expired refresh token",
    };
  }
};

export const logoutUser = async (
  dto: LogoutUserDto,
): Promise<AuthEntity> => {
  try {
    if (!dto.user_id) {
      return {
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "User ID is required",
      };
    }

    const user = await UserAccount.findByPk(dto.user_id);

    if (!user) {
      return {
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: "User not found",
      };
    }

    await user.update({
  access_token: "",
  refresh_token: "",
});
    return {
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Logged out successfully",
    };
  } catch (error) {
    logger.error(`Logout error: ${error}`);
    throw new Error("Logout failed");
  }
};