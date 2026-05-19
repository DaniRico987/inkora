import { ApiProperty } from '@nestjs/swagger';

export class ParticipantDto {
    @ApiProperty({ example: 15 })
    userId: number;

    @ApiProperty({ example: 'Ana' })
    firstName: string;

    @ApiProperty({ example: 'Pérez' })
    lastName: string;

    @ApiProperty({ example: 'ana@inkora.com' })
    email: string;

    @ApiProperty({ example: 'admin' })
    userType: 'client' | 'admin' | 'root';
}