import * as nodemailer from 'nodemailer';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {User} from './schemas/users.schema'
import {CreateAuthDto} from './dto/create-auth.dto'
import { LoginAuthDto } from './dto/login-auth.dto'

import { Request } from 'express';

import generateRandomId from '../methods/generateRandomId'
import getBearerToken from '../methods/getBearerToken'

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


@Injectable()
export class AuthService {
    constructor(@InjectModel(User.name) private userModule:Model<User>){}

    async sendConfirmationEmail(user:User) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'your-email@gmail.com',
            pass: 'your-password'
          }
        });
      
        const mailOptions = {
          from: 'your-email@gmail.com',
          to: user.email,
          subject: 'Подтверждение электронной почты',
          text: `Пожалуйста, перейдите по этой ссылке, чтобы подтвердить свою электронную почту: http://your-website.com/verify/${user.verificationToken}`
        };
      
        await transporter.sendMail(mailOptions);
    }

    async create(data:CreateAuthDto){
        if (!data.email || !data.name || !data.password) {
            return {
              code: 400,
              message: 'Not all arguments',
            };
        }
        try {
            
            const checkUser = await this.userModule.findOne({
                where: { email: data.email },
            });
            if(checkUser){
                return{
                    code:409,
                    message: 'This user already exists',
                }
            }

            const token = crypto.randomBytes(16).toString('hex');
            const generateId = generateRandomId();

            const result = await this.userModule.create({
                userId:generateId,
                name: data.name,
                email: data.email,
                password: bcrypt.hashSync(data.password),
                verification:false,
                verificationToken:token
              })
            ;

            await this.sendConfirmationEmail(result)

            return {
                code: 201,
                data: result,
            };
        } catch (err) {
            
            return{
                code:500,
                message: 'Internal server error',
            }
        }
    }
    async login(data:LoginAuthDto){
        
        if (!data.email || !data.password) {
            return {
              code: 400,
              message: 'Not all arguments',
            };
        }
        
        try {
            const checkUser = await this.userModule.findOne(
                { email: data.email }
            );
            
            if(!checkUser){
                return {
                    code: 404,
                    message: 'Not Found',
                };
            }            
            
            if (bcrypt.compareSync(data.password, checkUser.password)) {
                return {
                  code: 200,
                  token: jwt.sign(
                    { id: checkUser.userId },
                    "gfgd@43435sdfggppgdsf",
                  ),
                };
              } else {
                return {
                  code: 400,
                  message: 'Password is not correct',
                };
              }
        } catch (error) {
            return{
                code:500,
                message: 'Internal server error',
            }
        }
    }

    async verify(req: Request){
        const token = getBearerToken(req);
        
        try {
            if (!token) {
                return {
                  code: 400,
                  message: 'Not all arguments',
                };
              }
              const login = jwt.verify(token, "gfgd@43435sdfggppgdsf");
              
              
              const checkUser = await this.userModule.findOne(
                { userId: login.id }
                );
            
              console.log(checkUser);
              

              if (checkUser) {
                return {
                  code: 200,
                  data: checkUser,
                };
              }
        
              return {
                code: 404,
                message: 'Not Found',
              };
        } catch (err) {
            return {
                code: 500,
                message: err,
              };
        }
    }
}
