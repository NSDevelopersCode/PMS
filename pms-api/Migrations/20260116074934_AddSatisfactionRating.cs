using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSatisfactionRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "RatedAt",
                table: "Tickets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SatisfactionComment",
                table: "Tickets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SatisfactionScore",
                table: "Tickets",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RatedAt",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "SatisfactionComment",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "SatisfactionScore",
                table: "Tickets");
        }
    }
}
