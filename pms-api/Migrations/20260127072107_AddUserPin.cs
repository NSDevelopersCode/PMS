using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPinEnabled",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PinHash",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPinEnabled",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PinHash",
                table: "Users");
        }
    }
}
