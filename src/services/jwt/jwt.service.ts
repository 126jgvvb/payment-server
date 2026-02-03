/* eslint-disable prettier/prettier */
import { Injectable } from "@nestjs/common";
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JWTService{
    private readonly secret = 'system-daemons';
    private readonly expiresIn = '1h';

    createToken(adminID: string) {
        const payload = { sub: adminID };

        const token = jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
        return { accessToken: token };
}

    
    verifyToken(token: string) {
        try {
            return jwt.verify(token, this.secret) || true;
        }
        catch (e) {
            console.log('Error in token: ' + e);
            return false;
        }
    }
    
    
}