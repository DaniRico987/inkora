import {
  IsString,
  Length,
  MaxLength,
  IsDateString,
  IsOptional,
  IsIn,
  IsEmail,
  Matches,
  MinLength,
  IsArray,
  IsInt,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(6, 20)
  dni: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsDateString()
  birthDate: string;

  @IsOptional()
  @MaxLength(100)
  birthPlace?: string;

  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other', 'prefer_not_say'])
  gender?: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;

  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[];
}
